import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadSpace } from '../src/system/space.ts';

const ASSETS_DIR = path.resolve(import.meta.dirname, '__assets__');

afterEach(async () => {
  delete process.env.STORE_DIR;
  delete process.env.SQLITE_REL;
});

describe('load space', () => {
  it('loads defaults from empty anime.yaml', async () => {
    const root = path.join(ASSETS_DIR, 'space-default');

    const space = await loadSpace(root);

    expect({
      rootBasename: path.basename(space.root.path),
      storageDefault: path.relative(root, space.storage.default.path),
      sqlitePath: path.relative(root, space.sqlite.path.path),
      collections: space.collections.map((file) => path.relative(root, file.path)),
      downloader: space.downloader.provider
    }).toMatchInlineSnapshot(`
      {
        "collections": [],
        "downloader": "qbittorrent",
        "rootBasename": "space-default",
        "sqlitePath": "animespace.db",
        "storageDefault": "anime",
      }
    `);
  });

  it('loads .env values and resolves collections/sqlite/storage paths', async () => {
    const root = path.join(ASSETS_DIR, 'space-env');

    const space = await loadSpace(root);

    expect({
      storageDefault: path.relative(root, space.storage.default.path),
      sqlitePath: path.relative(root, space.sqlite.path.path),
      collections: space.collections.map((file) => path.relative(root, file.path))
    }).toMatchInlineSnapshot(`
      {
        "collections": [
          "collections/demo.yaml",
        ],
        "sqlitePath": "data/animespace.db",
        "storageDefault": "library/anime",
      }
    `);
  });
});
