import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';

import { parseYAMLWithEnvTag } from '../utils/yaml.ts';
import { type LocalPath, LocalFS } from '../utils/fs.ts';
import { resolveCollectionFiles } from '../subject/load.ts';
import { type Preference, PreferenceSchema } from '../subject/preference.ts';
import { type Downloader, DownloaderSchema } from '../download/downloader.ts';

import { type SQLite, SQLiteSchema, resolveDatabase } from './database.ts';
import { type Storage, StorageInputSchema, resolveStorage } from './storage.ts';

export interface Space {
  readonly root: LocalPath;

  readonly storage: Storage;

  readonly downloader: Downloader;

  readonly preference: Preference;

  readonly collections: LocalPath[];

  readonly sqlite: SQLite;
}

export const SpaceSchema = z.object({
  storage: StorageInputSchema.optional(),
  downloader: DownloaderSchema.optional(),
  preference: PreferenceSchema,
  collections: z.string().array().default(['collections/*.yml', 'collections/*.yaml']),
  sqlite: SQLiteSchema
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

function parseSpaceYAML(yaml: string) {
  const value = parseYAMLWithEnvTag(yaml);
  return SpaceSchema.parse(value);
}

export async function loadSpace(rootDir: string): Promise<Space> {
  const root = LocalFS.path(rootDir);

  dotenvConfig({
    path: root.join('.env').path,
    override: false,
    quiet: true
  });

  const configPath = root.join('anime.yaml');
  const configContent = (await configPath.exists()) ? await configPath.readText() : '';
  const config = parseSpaceYAML(configContent);

  const storage = resolveStorage(root, config.storage);
  const collections = await resolveCollectionFiles(root, config.collections);
  const sqlite = resolveDatabase(root, config.sqlite);

  return {
    root,
    storage,
    downloader: config.downloader ?? { provider: 'qbittorrent' },
    preference: config.preference ?? {},
    collections,
    sqlite
  };
}
