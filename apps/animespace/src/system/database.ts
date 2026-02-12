import path from 'node:path';

import { z } from 'zod';

import { LocalFS, type LocalPath } from '../utils/fs.js';

export interface SQLite {
  readonly path: LocalPath;
}

export const SQLiteSchema = z
  .object({
    path: z.string().optional()
  })
  .default({});

export type SQLiteConfig = z.infer<typeof SQLiteSchema>;

export function resolveDatabase(root: LocalPath, config: SQLiteConfig): SQLite {
  if (!config.path) {
    return { path: root.join('animespace.db') };
  }
  const resolvedPath = path.isAbsolute(config.path) ? config.path : path.resolve(root.path, config.path);
  return { path: LocalFS.path(resolvedPath) };
}
