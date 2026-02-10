import { z } from 'zod';

import { LocalPath, StoragePath } from '../utils/fs.js';

export type Storage = { default: StoragePath } & Record<string, StoragePath>;

export const StorageSchema = z.object({
  driver: z.enum(['local', 'webdav']),
  directory: z.string(),
  url: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional()
});

export function resolveStorage(root: LocalPath): Storage {
  return {
    default: root.join('anime')
  };
}

export async function validateStorage(storage: Storage) {}
