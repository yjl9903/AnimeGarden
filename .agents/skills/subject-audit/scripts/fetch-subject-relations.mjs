#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import { fetchSubject } from 'bgmx/client';

const ATTRIBUTION_RELATIONS = new Set(['前传', '续集']);

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}
if (args.subjectIds.length === 0 || !args.output) {
  throw new Error('--subject-ids and --output are required');
}

const records = [];
for (const subjectId of args.subjectIds) {
  const detail = await fetchSubject(subjectId, { timeout: 30 * 1000, retry: 1 });
  const relations = detail.relations
    .filter((relation) => ATTRIBUTION_RELATIONS.has(relation.relation))
    .map((relation) => ({
      id: relation.id,
      title: relation.title,
      relation: relation.relation,
      onairDate: relation.onair_date ?? null
    }));

  records.push({
    id: detail.subject.id,
    title: detail.subject.title,
    relations
  });
}

const counts = {
  subjects: records.length,
  subjectsWithRelations: records.filter((record) => record.relations.length > 0).length,
  relations: records.reduce((count, record) => count + record.relations.length, 0)
};
const header = {
  schema: 'subject-audit.subject-relations.v1',
  generatedAt: new Date().toISOString(),
  relationTypes: [...ATTRIBUTION_RELATIONS],
  counts
};
const outputPath = await writeJsonl(args.output, header, records);

process.stdout.write(`${JSON.stringify({ output: outputPath, counts })}\n`);

function parseArgs(argv) {
  const parsed = { subjectIds: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (token !== '--subject-ids' && token !== '--output') {
      throw new Error(`Unknown option: ${token}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }

    if (token === '--output') {
      parsed.output = value;
    } else {
      parsed.subjectIds.push(...parseSubjectIds(value));
    }
    index += 1;
  }

  parsed.subjectIds = [...new Set(parsed.subjectIds)];
  return parsed;
}

function parseSubjectIds(value) {
  return value.split(',').map((part) => {
    const subjectId = Number(part.trim());
    if (!Number.isSafeInteger(subjectId) || subjectId <= 0) {
      throw new Error(`Invalid Subject ID in --subject-ids: ${part}`);
    }
    return subjectId;
  });
}

function printHelp() {
  process.stdout.write(
    `Usage: node fetch-subject-relations.mjs --subject-ids <id[,id...]> --output <path>\n\nOptions:\n  --subject-ids <ids>  Candidate Subject IDs; repeat or use commas (required)\n  --output <path>      New JSONL evidence file (required)\n  -h, --help           Show this help\n`
  );
}

async function writeJsonl(output, header, evidence) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const content = [header, ...evidence].map((record) => JSON.stringify(record)).join('\n');
  await writeFile(outputPath, `${content}\n`, { encoding: 'utf8', flag: 'wx' });
  return outputPath;
}
