import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const loaderUrl = pathToFileURL(path.resolve(import.meta.dirname, '../src/env.ts')).href;
let directory: string;

// Use isolated processes so native env loading cannot mutate the test runner's environment.
function runLoader(env: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { loadEnvironment } from ${JSON.stringify(loaderUrl)};
       loadEnvironment();
       console.log(JSON.stringify({ value: process.env.ANIMEGARDEN_ENV_TEST_VALUE }));`
    ],
    { cwd: directory, env, encoding: 'utf8' }
  );
}

describe('native environment loading', () => {
  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), 'animegarden-env-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('loads .env from the working directory', () => {
    writeFileSync(path.join(directory, '.env'), 'ANIMEGARDEN_ENV_TEST_VALUE="from file # value"\n');

    const result = runLoader();

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ value: 'from file # value' });
  });

  it('preserves values already supplied by the process environment', () => {
    writeFileSync(path.join(directory, '.env'), 'ANIMEGARDEN_ENV_TEST_VALUE=from-file\n');

    const result = runLoader({ ANIMEGARDEN_ENV_TEST_VALUE: 'from-process' });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ value: 'from-process' });
  });

  it('allows .env to be absent', () => {
    const result = runLoader();

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({});
  });

  it('surfaces file errors other than a missing .env', () => {
    mkdirSync(path.join(directory, '.env'));

    const result = runLoader();

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.env');
  });
});
