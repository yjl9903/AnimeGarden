#!/usr/bin/env node

import { createReadStream } from 'node:fs';
import { mkdir, open, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

import {
  parseAdminPatchArguments,
  requestAdminAPI
} from '../../../../apps/server/src/manager/admin.ts';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}
if (!args.input || !args.output) throw new Error('--input and --output are required');

if (!args.apply) {
  const evidence = await readMatchEvidence(args.input);
  const plans = buildPlans(evidence.records);
  const counts = {
    input: evidence.records.length,
    planned: plans.length,
    alreadyTarget: evidence.records.length - plans.length
  };
  const header = {
    schema: 'subject-audit.binding-patches.v1',
    generatedAt: new Date().toISOString(),
    mode: 'preview',
    source: resolve(args.input),
    counts
  };
  const outputPath = await writeJsonl(
    args.output,
    header,
    plans.map((plan) => ({ ...plan, status: 'planned' }))
  );
  process.stdout.write(`${JSON.stringify({ output: outputPath, mode: 'preview', counts })}\n`);
  process.exit(0);
}

const preview = await readPatchPreview(args.input);
const plans = preview.plans;
const expectedCount = parseExpectedCount(args.expectedCount);
if (plans.length === 0) throw new Error('No resource binding changes are planned');
if (expectedCount !== plans.length) {
  throw new Error(
    `--expected-count is ${expectedCount}, but the input contains ${plans.length} planned changes`
  );
}

loadProjectEnvironment();
const outputPath = resolve(args.output);
const summary = await applyPlans(plans, {
  outputPath,
  source: resolve(args.input),
  expectedCount,
  url: args.url
});

process.stdout.write(`${JSON.stringify({ output: outputPath, mode: 'apply', counts: summary })}\n`);

function parseArgs(argv) {
  const parsed = {};
  const valueOptions = {
    '--input': 'input',
    '--output': 'output',
    '--expected-count': 'expectedCount',
    '--url': 'url'
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (token === '--apply') {
      parsed.apply = true;
      continue;
    }
    const key = valueOptions[token];
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
    `Usage:\n  node scripts/patch-resource-bindings.mjs --input <matches.jsonl> --output <preview.jsonl>\n  node scripts/patch-resource-bindings.mjs --input <preview.jsonl> --output <results.jsonl> --apply --expected-count <N> [--url <base-url>]\n\nOptions:\n  --input <path>          Match evidence for preview, or a confirmed preview for apply (required)\n  --output <path>         New preview or result JSONL file (required)\n  --apply                 Apply the confirmed preview through manager admin PATCH\n  --expected-count <N>    Confirm the exact number of online patches\n  --url <base-url>        Override the manager API base URL\n  -h, --help              Show this help\n`
  );
}

function parseExpectedCount(value) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count <= 0) {
    throw new Error('--expected-count must be a positive integer when --apply is used');
  }
  return count;
}

function loadProjectEnvironment() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(scriptDirectory, '../../../..');
  const result = config({ path: resolve(projectRoot, '.env'), quiet: true });
  if (result.error && result.error.code !== 'ENOENT') throw result.error;

  if (!process.env.ADMIN_SECRET?.trim() && !process.env.SECRET?.trim()) {
    throw new Error('Expected ADMIN_SECRET in the project .env or process environment');
  }
}

async function readMatchEvidence(path) {
  const records = [];
  const keys = new Set();
  let header;

  await readJsonl(path, (record, recordNumber) => {
    if (recordNumber === 1) {
      if (record?.schema !== 'subject-audit.subject-matches.v1') {
        throw new Error(`${path} must start with schema subject-audit.subject-matches.v1`);
      }
      header = record;
      return;
    }

    assertMatchRecord(path, recordNumber, record);
    const key = resourceKey(record.provider, record.providerId);
    if (keys.has(key)) throw new Error(`${path}:${recordNumber} duplicates ${key}`);
    keys.add(key);
    records.push(record);
  });

  if (header?.counts?.targets !== records.length) {
    throw new Error(
      `${path} declares ${header?.counts?.targets} targets but contains ${records.length}`
    );
  }
  return { header, records };
}

async function readPatchPreview(path) {
  const plans = [];
  const keys = new Set();
  let header;

  await readJsonl(path, (record, recordNumber) => {
    if (recordNumber === 1) {
      if (record?.schema !== 'subject-audit.binding-patches.v1' || record?.mode !== 'preview') {
        throw new Error(`${path} must be a binding patch preview`);
      }
      header = record;
      return;
    }

    assertPlanRecord(path, recordNumber, record);
    const resource = parseAdminPatchArguments(
      record.provider,
      String(record.providerId),
      record.targetSubjectId
    );
    const key = resourceKey(resource.provider, resource.providerId);
    if (keys.has(key)) throw new Error(`${path}:${recordNumber} duplicates ${key}`);
    keys.add(key);
    plans.push({
      provider: resource.provider,
      providerId: resource.providerId,
      title: record.title,
      evidenceCurrentSubjectId: record.evidenceCurrentSubjectId,
      targetSubjectId: resource.patch.subjectId,
      auditOutcome: record.auditOutcome
    });
  });

  if (header?.counts?.planned !== plans.length) {
    throw new Error(
      `${path} declares ${header?.counts?.planned} patches but contains ${plans.length}`
    );
  }
  return { header, plans };
}

function assertMatchRecord(path, recordNumber, record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`${path}:${recordNumber} must contain a JSON object`);
  }
  if (typeof record.provider !== 'string' || !record.provider.trim()) {
    throw new Error(`${path}:${recordNumber}.provider must be a non-empty string`);
  }
  if (
    (typeof record.providerId !== 'string' && typeof record.providerId !== 'number') ||
    !String(record.providerId).trim()
  ) {
    throw new Error(`${path}:${recordNumber}.providerId must be a non-empty string or number`);
  }
  if (typeof record.title !== 'string' || !record.title.trim()) {
    throw new Error(`${path}:${recordNumber}.title must be a non-empty string`);
  }
  if (!Number.isSafeInteger(record.targetSubjectId) || record.targetSubjectId <= 0) {
    throw new Error(`${path}:${recordNumber}.targetSubjectId must be a positive integer`);
  }
  if (
    record.currentSubjectId !== null &&
    (!Number.isSafeInteger(record.currentSubjectId) || record.currentSubjectId <= 0)
  ) {
    throw new Error(`${path}:${recordNumber}.currentSubjectId must be null or a positive integer`);
  }
}

function assertPlanRecord(path, recordNumber, record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`${path}:${recordNumber} must contain a JSON object`);
  }
  if (typeof record.provider !== 'string' || !record.provider.trim()) {
    throw new Error(`${path}:${recordNumber}.provider must be a non-empty string`);
  }
  if (
    (typeof record.providerId !== 'string' && typeof record.providerId !== 'number') ||
    !String(record.providerId).trim()
  ) {
    throw new Error(`${path}:${recordNumber}.providerId must be a non-empty string or number`);
  }
  if (typeof record.title !== 'string' || !record.title.trim()) {
    throw new Error(`${path}:${recordNumber}.title must be a non-empty string`);
  }
  if (
    record.evidenceCurrentSubjectId !== null &&
    (!Number.isSafeInteger(record.evidenceCurrentSubjectId) || record.evidenceCurrentSubjectId <= 0)
  ) {
    throw new Error(
      `${path}:${recordNumber}.evidenceCurrentSubjectId must be null or a positive integer`
    );
  }
  if (!Number.isSafeInteger(record.targetSubjectId) || record.targetSubjectId <= 0) {
    throw new Error(`${path}:${recordNumber}.targetSubjectId must be a positive integer`);
  }
  if (record.evidenceCurrentSubjectId === record.targetSubjectId) {
    throw new Error(`${path}:${recordNumber} does not contain a binding change`);
  }
  if (record.status !== 'planned') {
    throw new Error(`${path}:${recordNumber}.status must be planned`);
  }
}

function buildPlans(records) {
  return records.flatMap((record) => {
    if (record.currentSubjectId === record.targetSubjectId) return [];

    const resource = parseAdminPatchArguments(
      record.provider,
      String(record.providerId),
      record.targetSubjectId
    );
    return [
      {
        provider: resource.provider,
        providerId: resource.providerId,
        title: record.title,
        evidenceCurrentSubjectId: record.currentSubjectId,
        targetSubjectId: resource.patch.subjectId,
        auditOutcome: record.outcome
      }
    ];
  });
}

async function applyPlans(plans, options) {
  await mkdir(dirname(options.outputPath), { recursive: true });
  const output = await open(options.outputPath, 'wx');
  const counts = {
    planned: plans.length,
    completed: 0,
    changed: 0,
    unchanged: 0,
    failed: 0
  };
  let failure;

  try {
    await writeRecord(output, {
      schema: 'subject-audit.binding-patches.v1',
      generatedAt: new Date().toISOString(),
      mode: 'apply',
      source: options.source,
      apiBaseURL: options.url ?? 'manager-default',
      expectedCount: options.expectedCount,
      counts: { planned: plans.length }
    });

    // Apply sequentially and retain each acknowledgement before moving to the next resource.
    for (const plan of plans) {
      try {
        const response = await requestAdminAPI(
          `/admin/resources/${plan.provider}/${encodeURIComponent(plan.providerId)}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ subjectId: plan.targetSubjectId })
          },
          { url: options.url }
        );
        assertPatchResponse(plan, response);

        const status = response.changed ? 'changed' : 'unchanged';
        counts.completed += 1;
        counts[status] += 1;
        await writeRecord(output, {
          ...plan,
          status,
          changed: response.changed,
          serverPreviousSubjectId: response.previous.subjectId,
          serverSubjectId: response.resource.subjectId,
          evidenceDrift: response.previous.subjectId !== plan.evidenceCurrentSubjectId
        });
      } catch (error) {
        counts.failed += 1;
        failure = new Error(
          `Stopped after ${counts.completed} completed patches: ${errorMessage(error)}`,
          { cause: error }
        );
        await writeRecord(output, {
          ...plan,
          status: 'failed',
          error: errorMessage(error)
        });
        break;
      }
    }

    await writeRecord(output, {
      schema: 'subject-audit.binding-patches.summary.v1',
      completedAt: new Date().toISOString(),
      counts
    });
  } finally {
    await output.close();
  }

  if (failure) throw failure;
  return counts;
}

function assertPatchResponse(plan, response) {
  if (
    response?.status !== 'OK' ||
    response.resource?.provider !== plan.provider ||
    String(response.resource?.providerId) !== plan.providerId ||
    response.resource?.subjectId !== plan.targetSubjectId
  ) {
    throw new Error(
      `Unexpected admin patch response for ${resourceKey(plan.provider, plan.providerId)}`
    );
  }
}

async function readJsonl(path, visit) {
  const inputPath = resolve(path);
  const lines = createInterface({
    input: createReadStream(inputPath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });
  let lineNumber = 0;
  let recordNumber = 0;

  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    recordNumber += 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      throw new Error(`${inputPath}:${lineNumber} contains invalid JSON`, { cause: error });
    }
    visit(record, recordNumber);
  }

  if (recordNumber === 0) throw new Error(`${inputPath} is empty`);
}

function resourceKey(provider, providerId) {
  return `${provider}/${String(providerId)}`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function writeRecord(output, record) {
  await output.write(`${JSON.stringify(record)}\n`);
}

async function writeJsonl(output, header, records) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const content = [header, ...records].map((record) => JSON.stringify(record)).join('\n');
  await writeFile(outputPath, `${content}\n`, { encoding: 'utf8', flag: 'wx' });
  return outputPath;
}
