#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';

import { normalizeTitle } from '@animegarden/client';

// Import the production matcher directly so audits cannot drift from insertion semantics.
import {
  matchesSubjectSearch,
  normalizeSubjectSearch
} from '../../../../apps/server/src/subjects/filter.ts';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}
if (!args.resources || !args.subjects || !args.targets || !args.output) {
  throw new Error('--resources, --subjects, --targets, and --output are required');
}

const targets = await readTargets(args.targets);
const targetKeys = new Set(
  targets.map((target) => resourceKey(target.provider, target.providerId))
);
const targetSubjectIds = new Set(targets.map((target) => target.targetSubjectId));
const resources = await readResources(args.resources, targetKeys);
const subjects = await readSubjects(args.subjects, targetSubjectIds);

const records = targets.map((target) => {
  const key = resourceKey(target.provider, target.providerId);
  const resource = resources.get(key);
  if (!resource) throw new Error(`Target resource not found in --resources: ${key}`);

  const subject = subjects.get(target.targetSubjectId);
  if (!subject) {
    throw new Error(`Target Subject not found in --subjects: ${target.targetSubjectId}`);
  }

  const createdAt = parseDate(resource.createdAt, `${key}.createdAt`);
  const normalizedTitle = normalizeTitle(resource.title);
  const targetMatches = matchesSubjectSearch(subject.search, normalizedTitle, createdAt);
  const matchDiagnostics = diagnoseSubjectSearch(subject.search, normalizedTitle, createdAt);
  if (targetMatches !== matchDiagnostics.matches) {
    throw new Error(`Diagnostic result drifted from production matcher for ${key}`);
  }
  const bindingMatchesTarget = resource.subjectId === target.targetSubjectId;
  const outcome = !targetMatches
    ? 'search-filter-gap'
    : bindingMatchesTarget
      ? 'matched-current-binding'
      : 'binding-state-anomaly';

  return {
    provider: resource.provider,
    providerId: resource.providerId,
    title: resource.title,
    normalizedTitle,
    createdAt: createdAt.toISOString(),
    currentSubjectId: resource.subjectId,
    targetSubjectId: subject.id,
    targetSubjectTitle: subject.title,
    targetSubjectSearch: subject.search,
    targetMatches,
    matchDiagnostics: matchDiagnostics.details,
    bindingMatchesTarget,
    outcome
  };
});

const counts = {
  targets: records.length,
  targetMatches: records.filter((record) => record.targetMatches).length,
  searchFilterGaps: records.filter((record) => record.outcome === 'search-filter-gap').length,
  bindingStateAnomalies: records.filter((record) => record.outcome === 'binding-state-anomaly')
    .length,
  matchedCurrentBindings: records.filter((record) => record.outcome === 'matched-current-binding')
    .length
};
const header = {
  schema: 'subject-audit.subject-matches.v1',
  generatedAt: new Date().toISOString(),
  counts
};
const outputPath = await writeJsonl(args.output, header, records);

process.stdout.write(`${JSON.stringify({ output: outputPath, counts })}\n`);

function parseArgs(argv) {
  const parsed = {};
  const options = {
    '--resources': 'resources',
    '--subjects': 'subjects',
    '--targets': 'targets',
    '--output': 'output'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    const key = options[token];
    if (!key) throw new Error(`Unknown option: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function printHelp() {
  process.stdout.write(
    `Usage: node scripts/check-subject-matches.mjs --resources <resources.jsonl> --subjects <subjects.jsonl> --targets <targets.jsonl> --output <matches.jsonl>\n\nOptions:\n  --resources <path>  Resource evidence from fetch-resources.mjs (required)\n  --subjects <path>   Subject evidence from fetch-subjects.mjs (required)\n  --targets <path>    JSONL records with provider, providerId, targetSubjectId (required)\n  --output <path>     New JSONL result file (required)\n  -h, --help          Show this help\n`
  );
}

async function readTargets(path) {
  const targets = [];
  const keys = new Set();

  await readJsonl(path, (record, lineNumber) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`${path}:${lineNumber} must contain a JSON object`);
    }
    if (typeof record.provider !== 'string' || record.provider.length === 0) {
      throw new Error(`${path}:${lineNumber}.provider must be a non-empty string`);
    }
    if (
      (typeof record.providerId !== 'string' && typeof record.providerId !== 'number') ||
      String(record.providerId).length === 0
    ) {
      throw new Error(`${path}:${lineNumber}.providerId must be a non-empty string or number`);
    }
    if (!Number.isSafeInteger(record.targetSubjectId) || record.targetSubjectId <= 0) {
      throw new Error(`${path}:${lineNumber}.targetSubjectId must be a positive integer`);
    }

    const target = {
      provider: record.provider,
      providerId: String(record.providerId),
      targetSubjectId: record.targetSubjectId
    };
    const key = resourceKey(target.provider, target.providerId);
    if (keys.has(key)) throw new Error(`${path}:${lineNumber} duplicates target resource ${key}`);
    keys.add(key);
    targets.push(target);
  });

  if (targets.length === 0) throw new Error('--targets must contain at least one record');
  return targets;
}

async function readResources(path, targetKeys) {
  const resources = new Map();
  let header;
  let recordCount = 0;

  await readJsonl(path, (record, lineNumber) => {
    if (lineNumber === 1) {
      assertSchema(path, record, 'subject-audit.resources.v1');
      header = record;
      return;
    }
    recordCount += 1;
    const key = resourceKey(record.provider, record.providerId);
    if (targetKeys.has(key)) resources.set(key, record);
  });

  assertDeclaredCount(path, header?.counts?.resources, recordCount);
  return resources;
}

async function readSubjects(path, targetSubjectIds) {
  const subjects = new Map();
  let header;
  let recordCount = 0;

  await readJsonl(path, (record, lineNumber) => {
    if (lineNumber === 1) {
      assertSchema(path, record, 'subject-audit.subjects.v1');
      header = record;
      return;
    }
    recordCount += 1;
    if (targetSubjectIds.has(record.id)) subjects.set(record.id, record);
  });

  assertDeclaredCount(path, header?.counts?.subjects, recordCount);
  return subjects;
}

async function readJsonl(path, visit) {
  const inputPath = resolve(path);
  const lines = createInterface({
    input: createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });
  let lineNumber = 0;

  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${inputPath}:${lineNumber} contains invalid JSON`, {
        cause: error
      });
    }
    visit(record, lineNumber);
  }

  if (lineNumber === 0) throw new Error(`${inputPath} is empty`);
}

function assertSchema(path, header, expected) {
  if (header?.schema !== expected) {
    throw new Error(`${path} must start with schema ${expected}`);
  }
}

function assertDeclaredCount(path, declared, actual) {
  if (declared !== actual) {
    throw new Error(`${path} declares ${declared} records but contains ${actual}`);
  }
}

function resourceKey(provider, providerId) {
  return `${provider}/${String(providerId)}`;
}

function parseDate(value, field) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${field} must be a valid date`);
  return date;
}

/** Explain the current production result without replacing the production matcher as authority. */
function diagnoseSubjectSearch(search, title, createdAt) {
  const normalized = normalizeSubjectSearch(search);
  const normalizedTitle = normalizeTitle(title).toLowerCase();
  const createdAtTime = createdAt.getTime();
  const matchedIncludes = normalized.include.filter((value) => normalizedTitle.includes(value));
  const missingKeywords = normalized.keywords.filter((value) => !normalizedTitle.includes(value));
  const matchedExcludes = normalized.exclude.filter((value) => normalizedTitle.includes(value));
  const includeNearMisses =
    matchedIncludes.length === 0 ? findIncludeNearMisses(normalized.include, normalizedTitle) : [];
  const timeViolations = [];

  if (normalized.after !== undefined && createdAtTime < normalized.after) {
    timeViolations.push({
      field: 'after',
      boundary: normalized.after,
      boundaryISO: new Date(normalized.after).toISOString(),
      outsideByMs: normalized.after - createdAtTime
    });
  }
  if (normalized.before !== undefined && createdAtTime > normalized.before) {
    timeViolations.push({
      field: 'before',
      boundary: normalized.before,
      boundaryISO: new Date(normalized.before).toISOString(),
      outsideByMs: createdAtTime - normalized.before
    });
  }

  const failedConditions = [];
  if (matchedIncludes.length === 0) {
    failedConditions.push(includeNearMisses.length > 0 ? 'include-near-miss' : 'include-miss');
  }
  if (missingKeywords.length > 0) failedConditions.push('missing-keywords');
  if (matchedExcludes.length > 0) failedConditions.push('matched-exclude');
  failedConditions.push(...timeViolations.map((violation) => `${violation.field}-boundary`));

  return {
    matches:
      matchedIncludes.length > 0 &&
      missingKeywords.length === 0 &&
      matchedExcludes.length === 0 &&
      timeViolations.length === 0,
    details: {
      failedConditions,
      matchedIncludes,
      includeNearMisses,
      missingKeywords,
      matchedExcludes,
      timeViolations
    }
  };
}

/** Surface formatting-only include differences as review hints, not fuzzy matches. */
function findIncludeNearMisses(include, normalizedTitle) {
  const comparableTitle = toSeparatorInsensitive(normalizedTitle);

  return include.flatMap((value) => {
    const comparableValue = toSeparatorInsensitive(value);
    if (comparableValue.length < 2 || !comparableTitle.includes(comparableValue)) return [];
    return [
      {
        value,
        comparableValue,
        relation: 'separator-insensitive-substring'
      }
    ];
  });
}

/** Remove spacing, punctuation, and symbol separators for a narrow human-review comparison. */
function toSeparatorInsensitive(value) {
  return value
    .normalize('NFKC')
    .replace(/[\p{White_Space}\p{P}\p{S}]+/gu, '')
    .toLowerCase();
}

async function writeJsonl(output, header, records) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const content = [header, ...records].map((record) => JSON.stringify(record)).join('\n');
  await writeFile(outputPath, `${content}\n`, { encoding: 'utf8', flag: 'wx' });
  return outputPath;
}
