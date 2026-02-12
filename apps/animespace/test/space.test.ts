import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadSpace } from '../src/system/space.js';

const ASSETS_DIR = path.resolve(import.meta.dirname, '__assets__');

afterEach(async () => {
  delete process.env.STORE_DIR;
  delete process.env.SQLITE_REL;
});

describe('load space', () => {
  it('loads defaults from empty anime.yaml', async () => {
    const root = path.join(ASSETS_DIR, 'space-default');

    const space = await loadSpace(root);

    expect(space.root.path).toBe(root);
    expect(space.storage.default.path).toBe(path.join(root, 'anime'));
    expect(space.sqlite.path.path).toBe(path.join(root, 'animespace.db'));
    expect(space.collections).toEqual([]);
    expect(space.downloader.provider).toBe('qbittorrent');
  });

  it('loads .env values and resolves collections/sqlite/storage paths', async () => {
    const root = path.join(ASSETS_DIR, 'space-env');

    const space = await loadSpace(root);

    expect(space.storage.default.path).toBe(path.join(root, 'library/anime'));
    expect(space.sqlite.path.path).toBe(path.join(root, 'data/animespace.db'));
    expect(space.collections).toHaveLength(1);
    expect(space.collections[0]!.path).toBe(path.join(root, 'collections', 'demo.yaml'));
  });
});
