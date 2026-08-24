#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import { fetchSubjects } from 'bgmx/client';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}
if (!args.output) throw new Error('--output is required');

const subjects = [];
for await (const subject of fetchSubjects({ timeout: 30 * 1000, retry: 1 })) {
  subjects.push(subject);
}
const counts = {
  subjects: subjects.length
};
const header = {
  schema: 'subject-audit.subjects.v1',
  generatedAt: new Date().toISOString(),
  counts
};
const outputPath = await writeJsonl(args.output, header, subjects.map(toSubjectEvidence));

process.stdout.write(`${JSON.stringify({ output: outputPath, counts })}\n`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      parsed.help = true;
      continue;
    }
    if (token !== '--output') throw new Error(`Unknown option: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${token}`);
    }
    parsed.output = value;
    index += 1;
  }
  return parsed;
}

function printHelp() {
  process.stdout.write(
    `Usage: node fetch-subjects.mjs --output <path>\n\nOptions:\n  --output <path>     New JSONL evidence file (required)\n  -h, --help          Show this help\n`
  );
}

function toSubjectEvidence(subject) {
  const aliases = [...new Set(Object.values(subject.alias).flat())].filter(
    (alias) => alias && alias !== subject.title
  );
  return {
    id: subject.id,
    title: subject.title,
    aliases,
    search: subject.search,
    onairDate: subject.onair_date ?? subject.bangumi.date ?? null
  };
}

async function writeJsonl(output, header, records) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  const content = [header, ...records].map((record) => JSON.stringify(record)).join('\n');
  await writeFile(outputPath, `${content}\n`, { encoding: 'utf8', flag: 'wx' });
  return outputPath;
}
