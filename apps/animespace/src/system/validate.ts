import path from 'node:path';

import type { Subject } from '../subject/subject.js';

import type { Space } from './space.js';

export async function validateSpace(space: Space, subjects: Subject[] = []) {
  await validateStorage(space);
  await validateSubjects(space, subjects);
}

async function validateStorage(space: Space) {
  for (const storage of Object.values(space.storage)) {
    await storage.list();
  }
}

async function validateSubjects(space: Space, subjects: Subject[]) {
  validateUniqueSubjectName(subjects);
  validateStorageDriver(space, subjects);
  validateStoragePathPrefixConflict(subjects);
}

function normalizeStoragePath(input: string): string {
  const portablePath = input.replace(/\\/g, '/');
  if (
    path.isAbsolute(input) ||
    path.posix.isAbsolute(portablePath) ||
    path.win32.isAbsolute(input)
  ) {
    throw new Error(`Storage path "${input}" must be relative.`);
  }

  const segments = portablePath.split('/');
  if (segments.includes('..')) {
    throw new Error(`Storage path "${input}" cannot contain "..".`);
  }

  return path.posix.normalize(portablePath);
}

function normalizeComparablePath(input: string): string {
  const normalized = normalizeStoragePath(input);
  if (normalized === '.') {
    return '';
  }
  return normalized.replace(/\/+$/, '');
}

function hasPathConflict(left: string, right: string): boolean {
  const a = normalizeComparablePath(left);
  const b = normalizeComparablePath(right);
  if (a === b) {
    return true;
  }
  if (a.length === 0 || b.length === 0) {
    return true;
  }
  return a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function validateUniqueSubjectName(subjects: Subject[]) {
  const map = new Map<string, Subject>();
  for (const subject of subjects) {
    const prev = map.get(subject.name);
    if (prev) {
      throw new Error(`Duplicate subject name "${subject.name}".`);
    }
    map.set(subject.name, subject);
  }
}

function validateStorageDriver(space: Space, subjects: Subject[]) {
  const drivers = new Set(Object.keys(space.storage));
  for (const subject of subjects) {
    if (!drivers.has(subject.storage.driver)) {
      throw new Error(
        `Subject "${subject.name}" uses unknown storage driver "${subject.storage.driver}".`
      );
    }
  }
}

function validateStoragePathPrefixConflict(subjects: Subject[]) {
  const byDriver = new Map<string, Array<{ subject: Subject; path: string }>>();

  for (const subject of subjects) {
    const normalized = normalizeStoragePath(subject.storage.path);
    const entries = byDriver.get(subject.storage.driver) ?? [];
    entries.push({ subject, path: normalized });
    byDriver.set(subject.storage.driver, entries);
  }

  for (const [driver, entries] of byDriver.entries()) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const left = entries[i];
        const right = entries[j];
        if (hasPathConflict(left.path, right.path)) {
          throw new Error(
            `Storage path conflict under driver "${driver}": ` +
              `"${left.subject.name}" (${left.path}) and "${right.subject.name}" (${right.path}).`
          );
        }
      }
    }
  }
}
