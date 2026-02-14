import path from 'node:path';
import { glob } from 'node:fs/promises';
import createDebug from 'debug';

import type { System } from '../system/system.ts';

import { parseYAMLWithEnvTag } from '../utils/yaml.ts';
import { type LocalPath, LocalFS } from '../utils/fs.ts';

import { Collection } from './collection.ts';
import { type RawCollection, RawCollectionSchema } from './schema.ts';

const debug = createDebug('animespace:collection');

function parseCollectionYAML(yaml: string): RawCollection {
  const parsed = parseYAMLWithEnvTag(yaml);
  return RawCollectionSchema.parse(parsed);
}

async function loadCollection(system: System, file: LocalPath): Promise<Collection> {
  const content = await file.readText();
  const rawCollection = parseCollectionYAML(content);
  const collection = Collection.fromRaw(system, file, rawCollection);

  debug('load collection', collection.name, collection.enabled);
  if (debug.enabled) {
    for (const subject of collection.subjects) {
      debug('load subject', subject);
    }
  }

  return collection;
}

export async function loadCollections(system: System, files: LocalPath[]): Promise<Collection[]> {
  const collections = await Promise.all(files.map((file) => loadCollection(system, file)));
  return collections;
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
  debug('resolve collection files', [...files]);
  return [...files].sort().map((file) => LocalFS.path(file));
}
