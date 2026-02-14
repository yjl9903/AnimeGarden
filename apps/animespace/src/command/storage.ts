import path from 'node:path';

import type { System } from '../system/system.ts';
import type { LocalPath, StoragePath } from '../utils/fs.ts';

import { LocalFS } from '../utils/fs.ts';

export interface StorageCommandOptions {
  storage?: string;
}

export interface ListStorageOptions extends StorageCommandOptions {}

export interface GetStorageOptions extends StorageCommandOptions {
  output?: string;
}

export interface PutStorageOptions extends StorageCommandOptions {
  input?: string;
}

export interface MoveStorageOptions extends StorageCommandOptions {
  srcStorage?: string;
  dstStorage?: string;
}

export async function listStorage(
  system: System,
  file: string | undefined,
  options: ListStorageOptions
) {
  const storage = requireStorage(system, options.storage);
  const filepath = resolveStoragePath(storage, file, { allowRoot: true });
  const content = await filepath.list();

  for (const entry of content) {
    system.logger.log(`- ${entry.path}`);
  }
}

export async function getStorage(system: System, file: string, options: GetStorageOptions) {
  const storage = requireStorage(system, options.storage);
  const source = resolveStoragePath(storage, file, { allowRoot: false });
  const output = await resolveDownloadOutputPath(source, options.output);

  await source.copyTo(output);
  system.logger.log(`Downloaded: ${source.path} -> ${output.path}`);
}

export async function putStorage(system: System, file: string, options: PutStorageOptions) {
  const storage = requireStorage(system, options.storage);
  const target = resolveStoragePath(storage, file, { allowRoot: false });
  const input = resolveLocalPath(options.input ?? file);

  await input.copyTo(target);
  system.logger.log(`Uploaded: ${input.path} -> ${target.path}`);
}

export async function removeStorage(system: System, file: string, options: StorageCommandOptions) {
  const storage = requireStorage(system, options.storage);
  const target = resolveStoragePath(storage, file, { allowRoot: false });

  await target.remove();
  system.logger.log(`Removed: ${target.path}`);
}

export async function moveStorage(
  system: System,
  src: string,
  dst: string,
  options: MoveStorageOptions
) {
  const srcStorageName = options.srcStorage ?? options.storage;
  const dstStorageName = options.dstStorage ?? options.storage;

  const srcStorage = requireStorage(system, srcStorageName);
  const dstStorage = requireStorage(system, dstStorageName);

  const source = resolveStoragePath(srcStorage, src, { allowRoot: false });
  const target = resolveStoragePath(dstStorage, dst, { allowRoot: false });

  await source.moveTo(target);
  system.logger.log(`Moved: ${source.path} -> ${target.path}`);
}

function requireStorage(system: System, name: string | undefined): StoragePath {
  const storage = system.space.storage[name || 'default'];
  if (!storage) {
    throw new Error(`Storage "${name}" does not exist.`);
  }
  return storage;
}

function resolveStoragePath(
  storage: StoragePath,
  file: string | undefined,
  options: { allowRoot: boolean }
): StoragePath {
  const normalized = normalizeStorageInput(file, options.allowRoot);
  if (normalized.length === 0) {
    return storage;
  }
  return storage.join(normalized);
}

function normalizeStorageInput(file: string | undefined, allowRoot: boolean) {
  const raw = (file ?? '').trim();
  if (raw.length === 0) {
    if (allowRoot) {
      return '';
    }
    throw new Error('Storage path is required.');
  }

  const portable = raw.replace(/\\/g, '/');

  if (path.isAbsolute(raw) || path.posix.isAbsolute(portable) || path.win32.isAbsolute(raw)) {
    throw new Error(`Storage path "${file}" must be relative.`);
  }

  const segments = portable.split('/');
  if (segments.includes('..')) {
    throw new Error(`Storage path "${file}" cannot contain "..".`);
  }

  const normalized = path.posix.normalize(portable);
  if (normalized === '.' || normalized === '') {
    if (allowRoot) {
      return '';
    }
    throw new Error(`Storage path "${file}" is invalid.`);
  }

  return normalized;
}

function resolveLocalPath(file: string): LocalPath {
  return LocalFS.path(path.resolve(process.cwd(), file));
}

async function resolveDownloadOutputPath(
  source: StoragePath,
  output: string | undefined
): Promise<LocalPath> {
  if (!output) {
    if (!source.basename) {
      throw new Error(`Cannot infer output path from "${source.path}".`);
    }
    return resolveLocalPath(source.basename);
  }

  const target = resolveLocalPath(output);
  if (await target.exists()) {
    if (await target.isDirectory()) {
      return target.join(source.basename);
    }
  }
  return target;
}
