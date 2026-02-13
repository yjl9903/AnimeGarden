import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Resource, FetchResourcesOptions, FetchResourcesResult } from '@animegarden/client';

import { System } from '../src/system/system.ts';

const { fetchResourcesMock } = vi.hoisted(() => ({
  fetchResourcesMock: vi.fn()
}));

vi.mock('@animegarden/client', async () => {
  const actual = await vi.importActual<typeof import('@animegarden/client')>('@animegarden/client');
  return {
    ...actual,
    fetchResources: fetchResourcesMock
  };
});

const roots: string[] = [];

afterEach(async () => {
  fetchResourcesMock.mockReset();
  delete process.env.ANIMESPACE_ROOT;
  for (const root of [...roots]) {
    await rm(root, { recursive: true, force: true });
  }
});

describe('anime garden source manager', () => {
  it('reads from cache and refreshes when forced', async () => {
    const system = await createSystem();
    const manager = system.animegardenSourceManager;

    const firstResource = makeResource(1, 'Test Resource 1');
    const secondResource = makeResource(2, 'Test Resource 2');

    fetchResourcesMock
      .mockResolvedValueOnce(makeSuccessResult([firstResource])) // initialize
      .mockResolvedValueOnce(makeSuccessResult([firstResource])) // first query
      .mockResolvedValueOnce(makeSuccessResult([firstResource, secondResource])); // refresh

    const first = await manager.fetchResources({ include: ['Test'] });
    expect(first.ok).toBe(true);
    expect(first.resources.map((resource) => resource.title)).toEqual(['Test Resource 1']);
    expect(fetchResourcesMock).toHaveBeenCalledTimes(2);

    const second = await manager.fetchResources({ include: ['Test'] });
    expect(second.ok).toBe(true);
    expect(second.resources.map((resource) => resource.title)).toEqual(['Test Resource 1']);
    expect(fetchResourcesMock).toHaveBeenCalledTimes(2);

    const refreshed = await manager.refresh({ include: ['Test'] });
    expect(refreshed.ok).toBe(true);
    expect(refreshed.resources.map((resource) => resource.title)).toEqual([
      'Test Resource 2',
      'Test Resource 1'
    ]);
    expect(fetchResourcesMock).toHaveBeenCalledTimes(3);

    system.close();
  });

  it('throws when remote request fails', async () => {
    const system = await createSystem();
    const manager = system.animegardenSourceManager;
    const remoteError = new Error('remote failed');

    fetchResourcesMock
      .mockResolvedValueOnce(makeSuccessResult([makeResource(1, 'Init')])) // initialize
      .mockResolvedValueOnce(makeFailureResult(remoteError)); // first query

    await expect(manager.fetchResources({ include: ['Init'] })).rejects.toThrow('remote failed');

    system.close();
  });
});

function makeResource(id: number, title: string): Resource<FetchResourcesOptions> {
  return {
    id,
    provider: 'dmhy',
    providerId: String(id),
    title,
    href: `https://example.com/resource/${id}`,
    type: '动画',
    magnet: `magnet:?xt=urn:btih:${id}`,
    tracker: 'udp://tracker.example:80',
    size: 1024 + id,
    publisher: {
      id: 1,
      name: 'Publisher'
    },
    fansub: {
      id: 10,
      name: 'Fansub'
    },
    createdAt: new Date(`2025-01-01T00:00:0${id}.000Z`),
    fetchedAt: new Date('2025-01-02T00:00:00.000Z')
  };
}

function makeSuccessResult(
  resources: Resource<FetchResourcesOptions>[]
): FetchResourcesResult<FetchResourcesOptions> {
  return {
    ok: true,
    resources,
    pagination: {
      page: 1,
      pageSize: resources.length,
      complete: true
    },
    filter: {},
    timestamp: new Date('2025-01-03T00:00:00.000Z'),
    error: undefined
  };
}

function makeFailureResult(error: Error): FetchResourcesResult<FetchResourcesOptions> {
  return {
    ok: false,
    resources: [],
    pagination: undefined,
    filter: undefined,
    timestamp: undefined,
    error
  };
}

async function createSystem() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'animespace-manager-'));
  roots.push(root);
  await writeFile(path.join(root, 'anime.yaml'), '{}\n');

  process.env.ANIMESPACE_ROOT = root;

  const system = new System();
  await system.loadSpace();
  await system.openDatabase();

  return system;
}
