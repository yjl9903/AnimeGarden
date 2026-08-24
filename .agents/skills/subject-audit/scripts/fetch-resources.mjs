#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import { fetchResources } from '@animegarden/client';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

if (!args.start || !args.end || !args.output) {
  throw new Error('--start, --end, and --output are required');
}

const start = parseDate(args.start, '--start');
const end = parseDate(args.end, '--end');
if (start.getTime() >= end.getTime()) throw new Error('--start must be earlier than --end');

const result = await fetchResources({
  preset: 'bangumi',
  type: '动画',
  after: start,
  before: end,
  count: -1,
  retry: 1,
  timeout: 30 * 1000
});
if (!result.ok) throw result.error;

const resources = result.resources.filter((resource) => {
  const createdAt = resource.createdAt.getTime();
  return Number.isFinite(createdAt) && createdAt >= start.getTime() && createdAt <= end.getTime();
});
const withSubjectId = resources.filter(
  (resource) => resource.subjectId !== null && resource.subjectId !== undefined
).length;
const counts = {
  resources: resources.length,
  withSubjectId,
  withSubjectIdRate:
    resources.length === 0 ? 0 : Number((withSubjectId / resources.length).toFixed(4)),
  unbound: resources.length - withSubjectId
};
const header = {
  schema: 'subject-audit.resources.v1',
  generatedAt: new Date().toISOString(),
  start: start.toISOString(),
  end: end.toISOString(),
  counts
};
const outputPath = await writeJsonl(args.output, header, resources.map(toResourceEvidence));

process.stdout.write(`${JSON.stringify({ output: outputPath, counts })}\n`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--'))
      throw new Error(`Missing value for ${token}`);
    index += 1;
    const key = {
      '--start': 'start',
      '--end': 'end',
      '--output': 'output'
    }[token];
    if (!key) throw new Error(`Unknown option: ${token}`);
    parsed[key] = value;
  }
  return parsed;
}

function printHelp() {
  process.stdout.write(
    `Usage: node fetch-resources.mjs --start <ISO> --end <ISO> --output <path>\n\nOptions:\n  --start <ISO>       Scan interval start (required)\n  --end <ISO>         Scan interval end (required)\n  --output <path>     New JSONL evidence file (required)\n  -h, --help          Show this help\n`
  );
}

function parseDate(value, option) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`${option} must be a valid date`);
  return date;
}

function toResourceEvidence(resource) {
  return {
    provider: resource.provider,
    providerId: resource.providerId,
    subjectId: resource.subjectId ?? null,
    title: resource.title,
    createdAt: resource.createdAt
  };
}

async function writeJsonl(output, header, records) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const content = [header, ...records].map((record) => JSON.stringify(record)).join('\n');
  await writeFile(outputPath, `${content}\n`, { encoding: 'utf8', flag: 'wx' });
  return outputPath;
}
