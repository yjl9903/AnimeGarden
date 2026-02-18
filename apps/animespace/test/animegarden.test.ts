import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Resource, FetchResourcesOptions, FetchResourcesResult } from '@animegarden/client';

import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

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

const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  fetchResourcesMock.mockReset();
  await kit.cleanup();
});

describe('anime garden source manager', () => {
  it('reads from cache and refreshes when forced', async () => {
    const system = await kit.createSystem({ openDatabase: true });
    const manager = system.managers.animegarden;

    const firstResource = makeResource(1, 'Test Resource 1');
    const secondResource = makeResource(2, 'Test Resource 2');

    fetchResourcesMock
      .mockResolvedValueOnce(makeSuccessResult([firstResource])) // initialize
      .mockResolvedValueOnce(makeSuccessResult([firstResource])) // first query
      .mockResolvedValueOnce(makeSuccessResult([firstResource, secondResource])); // refresh

    const first = await manager.fetchResources({ include: ['Test'] });
    expect({
      ok: first.ok,
      titles: first.resources.map((resource) => resource.title),
      calls: fetchResourcesMock.mock.calls.length
    }).toMatchInlineSnapshot(`
      {
        "calls": 2,
        "ok": true,
        "titles": [
          "Test Resource 1",
        ],
      }
    `);

    const second = await manager.fetchResources({ include: ['Test'] });
    expect({
      ok: second.ok,
      titles: second.resources.map((resource) => resource.title),
      calls: fetchResourcesMock.mock.calls.length
    }).toMatchInlineSnapshot(`
      {
        "calls": 2,
        "ok": true,
        "titles": [
          "Test Resource 1",
        ],
      }
    `);

    const refreshed = await manager.fetchResources({ include: ['Test'] }, true);
    expect({
      ok: refreshed.ok,
      titles: refreshed.resources.map((resource) => resource.title),
      calls: fetchResourcesMock.mock.calls.length
    }).toMatchInlineSnapshot(`
      {
        "calls": 3,
        "ok": true,
        "titles": [
          "Test Resource 2",
          "Test Resource 1",
        ],
      }
    `);
  });

  it('throws when remote request fails', async () => {
    const system = await kit.createSystem({ openDatabase: true });
    const manager = system.managers.animegarden;
    const remoteError = new Error('remote failed');

    fetchResourcesMock
      .mockResolvedValueOnce(makeSuccessResult([makeResource(1, 'Init')])) // initialize
      .mockResolvedValueOnce(makeFailureResult(remoteError)); // first query

    await expect(manager.fetchResources({ include: ['Init'] })).rejects.toThrow('remote failed');
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
