import path from 'node:path';

import { z } from 'zod';
import { WebDAVFS } from 'breadfs/webdav';

import { type LocalPath, type StoragePath, LocalFS } from '../utils/fs.js';

export type Storage = { default: StoragePath } & Record<string, StoragePath>;

export const StorageSchema = z.object({
  driver: z.enum(['local', 'webdav']),
  directory: z.string(),
  url: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional()
});

export const StorageInputSchema = z
  .union([StorageSchema, z.record(z.string(), StorageSchema)])
  .optional();

type StorageConfig = z.infer<typeof StorageSchema>;

type StorageMapConfig = Record<string, StorageConfig>;

function normalizeStorageInput(root: LocalPath, input: unknown): StorageMapConfig {
  if (input === undefined || input === null) {
    return { default: defaultStorage(root) };
  }
  const single = StorageSchema.safeParse(input);
  if (single.success) {
    return { default: single.data };
  }
  const parsed = z.record(z.string(), StorageSchema).parse(input);
  return {
    ...parsed,
    default: parsed.default ?? defaultStorage(root)
  };
}

function defaultStorage(root: LocalPath): StorageConfig {
  return {
    driver: 'local',
    directory: root.join('anime').path
  };
}

function resolveStoragePath(root: LocalPath, config: StorageConfig, name: string): StoragePath {
  switch (config.driver) {
    case 'local': {
      const directory = path.isAbsolute(config.directory)
        ? config.directory
        : path.resolve(root.path, config.directory);
      return LocalFS.path(directory);
    }
    case 'webdav': {
      if (!config.url) {
        throw new Error(`Storage "${name}" with driver "webdav" requires "url".`);
      }
      const webdav = WebDAVFS.make(config.url, {
        username: config.username,
        password: config.password
      });
      const directory = config.directory.startsWith('/')
        ? config.directory
        : `/${config.directory}`;
      return webdav.path(directory);
    }
  }
}

export function resolveStorage(root: LocalPath, input?: unknown): Storage {
  const normalized = normalizeStorageInput(root, input);
  const storage: Record<string, StoragePath> = {};
  for (const [name, config] of Object.entries(normalized)) {
    storage[name] = resolveStoragePath(root, config, name);
  }
  if (!storage.default) {
    storage.default = resolveStoragePath(root, defaultStorage(root), 'default');
  }
  return {
    default: storage.default,
    ...storage
  };
}
