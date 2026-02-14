import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { System } from '../src/system/system.ts';
import { LocalFS } from '../src/utils/fs.ts';
import { loadCollections } from '../src/subject/load.ts';

const ASSETS_DIR = path.resolve(import.meta.dirname, '__assets__');

describe('load collections and subjects', () => {
  it('normalizes subject defaults and collection inheritance', async () => {
    const file = path.join(ASSETS_DIR, 'collections', 'valid.yaml');

    const system = new System();

    const [collection] = await loadCollections(system, [LocalFS.path(file)]);

    expect(collection).toBeDefined();
    expect(collection!.name).toBe('demo');
    expect(collection!.enabled).toBe(false);
    expect(collection!.subjects).toHaveLength(2);

    const [a, b] = collection!.subjects;
    expect(a!.enabled).toBe(false);
    expect(a!.storage.driver).toBe('default');
    expect(a!.storage.path).toBe('Subject-A');

    expect(b!.enabled).toBe(true);
    expect(b!.storage.driver).toBe('custom');
    expect(b!.storage.path).toBe('nested/path');
  });

  it('rejects null naming/source in subject configs', async () => {
    const file = path.join(ASSETS_DIR, 'collections', 'invalid-null.yaml');

    const system = new System();

    await expect(loadCollections(system, [LocalFS.path(file)])).rejects.toThrow();
  });

  it('loads subjects through System.loadSubjects', async () => {
    const root = path.join(ASSETS_DIR, 'system');

    process.env.ANIMESPACE_ROOT = root;

    const system = new System();
    await system.loadSpace();
    const subjects = await system.loadSubjects();

    expect(subjects).toHaveLength(1);
    expect(subjects[0]!.name).toBe('Subject-A');
    expect(subjects[0]!.enabled).toBe(true);
  });
});
