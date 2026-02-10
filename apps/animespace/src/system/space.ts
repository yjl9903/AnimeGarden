import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';
import { parse } from 'yaml';

import type { LocalPath } from '../utils/fs.js';

import { LocalFS } from '../utils/fs.js';
import { type Downloader, DownloaderSchema } from '../download/downloader.js';

import type { Preference } from './preference.js';

import { PreferenceSchema } from './preference.js';
import { type Storage, StorageSchema, resolveStorage, validateStorage } from './storage.js';

export interface Space {
  readonly root: LocalPath;

  readonly storage: Storage;

  readonly downloader: Downloader;

  readonly preference: Preference;

  readonly collections: LocalPath[];
}

export const SpaceSchema = z.object({
  storage: z.record(z.string(), StorageSchema),
  downloader: DownloaderSchema,
  preference: PreferenceSchema,
  collections: z.string().array().default(['./collections/*.yml', './collections/*.yaml'])
});

export function inferRoot() {
  try {
    const envRoot = process.env.ANIMESPACE_ROOT;
    if (envRoot) {
      return path.resolve(envRoot);
    }
  } catch {}
  return path.resolve(os.homedir(), '.animespace');
}

export async function loadSpace(): Promise<Space> {
  const rootDir = inferRoot();
  const root = LocalFS.path(rootDir);

  // TODO: load anime.yaml

  const storage = resolveStorage(root);

  return {
    root,
    storage,
    downloader: {
      provider: 'qbittorrent'
    },
    preference: {},
    collections: []
  };
}

export async function validateSpace(space: Space) {
  await validateStorage(space.storage);
}
