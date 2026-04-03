import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadSpace } from '../src/system/space.ts';
import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

const ASSETS_DIR = path.resolve(import.meta.dirname, '__assets__');
const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  delete process.env.STORE_DIR;
  delete process.env.SQLITE_REL;
  delete process.env.ANIMEGARDEN_RETRY;
  await kit.cleanup();
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

  it('loads bangumi uid from anime.yaml', async () => {
    const root = await kit.createTempRoot({
      yaml: `
bangumi:
  uid: 123456
collections: []
`
    });

    const space = await loadSpace(root);

    expect(space.bangumi).toEqual({ uid: 123456 });
  });

  it('loads animegarden retry from anime.yaml', async () => {
    const root = await kit.createTempRoot({
      yaml: `
animegarden:
  retry: 3
collections: []
`
    });

    const space = await loadSpace(root);

    expect(space.animegarden).toEqual({ retry: 3 });
  });

  it('coerces animegarden retry from env-backed yaml values', async () => {
    process.env.ANIMEGARDEN_RETRY = '5';

    const root = await kit.createTempRoot({
      yaml: `
animegarden:
  retry: !env ANIMEGARDEN_RETRY
collections: []
`
    });

    const space = await loadSpace(root);

    expect(space.animegarden).toEqual({ retry: 5 });
  });
});
