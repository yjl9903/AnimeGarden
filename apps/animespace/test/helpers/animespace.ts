import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import { Subject } from '../../src/subject/subject.ts';
import { type System, makeSystem } from '../../src/system/system.ts';
import {
  type RawCollection,
  RawCollectionSchema,
  RawSubjectSchema
} from '../../src/subject/schema.ts';

type CreateSystemOptions = {
  root?: string;
  yaml?: string;
  openDatabase?: boolean;
};

type CreateRootOptions = {
  prefix?: string;
  yaml?: string;
};

export function createAnimeSpaceTestKit() {
  const roots: string[] = [];
  const systems: System[] = [];

  async function createTempRoot(options: CreateRootOptions = {}): Promise<string> {
    const root = await mkdtemp(path.join(os.tmpdir(), options.prefix ?? 'animespace-test-'));
    roots.push(root);
    await writeFile(path.join(root, 'anime.yaml'), options.yaml ?? '{}\n');
    return root;
  }

  async function createSystem(options: CreateSystemOptions = {}): Promise<System> {
    const root = options.root ?? (await createTempRoot({ yaml: options.yaml }));
    const system = await makeSystem(root);
    if (options.openDatabase) {
      await system.openDatabase();
    }
    systems.push(system);

    return system;
  }

  async function writeRootFile(
    root: string,
    relativePath: string,
    content: string
  ): Promise<string> {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
    return absolutePath;
  }

  function parseRawCollection(raw: unknown): RawCollection {
    return RawCollectionSchema.parse(raw);
  }

  function parseRawSubject(raw: unknown) {
    return RawSubjectSchema.parse(raw);
  }

  function createSubjectFromSource(
    system: System,
    source: unknown,
    options: {
      name?: string;
      naming?: unknown;
      collection?: Omit<RawCollection, 'subjects'> & { subjects?: never };
      subject?: Record<string, unknown>;
    } = {}
  ): Subject {
    const rawCollection = RawCollectionSchema.parse({
      ...(options.collection ?? {}),
      subjects: [
        {
          name: options.name ?? 'Subject-A',
          naming: options.naming ?? {},
          source,
          ...(options.subject ?? {})
        }
      ]
    });
    return Subject.fromRaw(system, rawCollection, rawCollection.subjects[0]!);
  }

  async function cleanup() {
    for (const system of systems.splice(0)) {
      system.close();
    }
    for (const root of roots.splice(0)) {
      await rm(root, { recursive: true, force: true });
    }
  }

  return {
    createTempRoot,
    createSystem,
    writeRootFile,
    parseRawCollection,
    parseRawSubject,
    createSubjectFromSource,
    cleanup
  };
}
