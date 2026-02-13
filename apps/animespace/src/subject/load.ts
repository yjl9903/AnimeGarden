import path from 'node:path';
import { glob } from 'node:fs/promises';

import type { System } from '../system/system.ts';

import { parseYAMLWithEnvTag } from '../utils/yaml.ts';
import { type LocalPath, LocalFS } from '../utils/fs.ts';

import { Collection } from './collection.ts';
import { type RawCollection, RawCollectionSchema } from './schema.ts';

function parseCollectionYAML(yaml: string): RawCollection {
  const parsed = parseYAMLWithEnvTag(yaml);
  return RawCollectionSchema.parse(parsed);
}

async function loadCollection(system: System, file: LocalPath): Promise<Collection> {
  const content = await file.readText();
  const rawCollection = parseCollectionYAML(content);
  return Collection.fromRaw(system, file, rawCollection);
}

export async function loadCollections(system: System, files: LocalPath[]): Promise<Collection[]> {
  return Promise.all(files.map((file) => loadCollection(system, file)));
}

export async function resolveCollectionFiles(
  root: LocalPath,
  patterns: string[]
): Promise<LocalPath[]> {
  const files = new Set<string>();
  for (const pattern of patterns) {
    for await (const matched of glob(pattern, { cwd: root.path })) {
      const absolute = path.isAbsolute(matched) ? matched : path.resolve(root.path, matched);
      files.add(path.normalize(absolute));
    }
  }
  return [...files].sort().map((file) => LocalFS.path(file));
}
