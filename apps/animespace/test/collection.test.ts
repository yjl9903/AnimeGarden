import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalFS } from '../src/utils/fs.ts';
import { loadCollections } from '../src/subject/load.ts';
import { Collection } from '../src/subject/collection.ts';
import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

const ASSETS_DIR = path.resolve(import.meta.dirname, '__assets__');
const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  vi.restoreAllMocks();
  await kit.cleanup();
});

describe('load collections and subjects', () => {
  it('normalizes subject defaults and collection inheritance', async () => {
    const root = path.join(ASSETS_DIR, 'system');
    const file = path.join(ASSETS_DIR, 'collections', 'valid.yaml');

    const system = await kit.createSystem({ root });

    const [collection] = await loadCollections(system, [LocalFS.path(file)]);

    expect({
      name: collection?.name,
      enabled: collection?.enabled,
      subjects:
        collection?.subjects.map((subject) => ({
          name: subject.name,
          enabled: subject.enabled,
          storage: subject.storage
        })) ?? []
    }).toMatchInlineSnapshot(`
      {
        "enabled": false,
        "name": "demo",
        "subjects": [
          {
            "enabled": false,
            "name": "Subject-A",
            "storage": {
              "driver": "default",
              "path": "Subject-A",
            },
          },
          {
            "enabled": true,
            "name": "Subject-B",
            "storage": {
              "driver": "custom",
              "path": "nested/path",
            },
          },
        ],
      }
    `);
  });

  it('rejects null naming/source in subject configs', async () => {
    const root = path.join(ASSETS_DIR, 'system');
    const file = path.join(ASSETS_DIR, 'collections', 'invalid-null.yaml');
    const system = await kit.createSystem({ root });

    await expect(loadCollections(system, [LocalFS.path(file)])).rejects.toThrow();
  });

  it('loads subjects through System.loadSubjects', async () => {
    const root = path.join(ASSETS_DIR, 'system');
    const system = await kit.createSystem({ root });
    const subjects = await system.loadSubjects();

    expect(
      subjects.map((subject) => ({
        name: subject.name,
        enabled: subject.enabled
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "enabled": true,
          "name": "Subject-A",
        },
      ]
    `);
  });
});
