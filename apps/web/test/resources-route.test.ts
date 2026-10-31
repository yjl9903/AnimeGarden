import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { decodeResourcesCursor } from '@animegarden/shared';

const { setCacheControl, setErrorResponse, fetchResourcesFn } = vi.hoisted(() => ({
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn(),
  fetchResourcesFn: vi.fn()
}));
vi.mock('~/pages/resources.($page)/route', () => ({ default: () => null }));
vi.mock('~/query/proxy', () => ({ fetchResourcesFn }));
vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl,
  setErrorResponse
}));

import { loader as legacyPageLoader } from '../src/routes/resources/$page';
import { Route as resourcesRoute, loader } from '../src/routes/resources/index';
import { updateCurrentResourceAnchor } from '../src/query/animegarden';

const anchor = Date.parse('2026-07-01');
let queryClient: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient();
  fetchResourcesFn.mockResolvedValue({
    ok: true,
    resources: [],
    pagination: { anchor, limit: 30, nextCursor: null, complete: true },
    filter: { types: ['动画'], fansubs: ['resolved'] },
    timestamp: new Date(anchor),
    error: undefined
  });
});
afterEach(() => queryClient.clear());

describe('resources route loader', () => {
  it('uses filter-only loader dependencies', () => {
    expect(
      resourcesRoute.options.loaderDeps!({
        search: { type: '动画', fansub: 'ANi', cursor: 'next', limit: '1' }
      } as never)
    ).toEqual({ fansub: 'ANi', type: '动画' });
  });

  it('redirects legacy paths without retaining cursor state', () => {
    try {
      legacyPageLoader({ location: { searchStr: '?fansub=ANi&page=2&cursor=next&limit=1' } });
      throw new Error('Expected redirect');
    } catch (response) {
      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(308);
      expect(response).toMatchObject({
        options: { to: '/resources', replace: true, search: { fansub: 'ANi' } }
      });
    }
  });

  it('uses the globally known version rather than a version frozen into navigation state', async () => {
    updateCurrentResourceAnchor(queryClient, anchor);
    const result = await loader({
      context: { queryClient },
      location: {
        href: 'https://animes.garden/resources?type=动画',
        state: { resourceRefineAnchor: '2020-01-01' }
      }
    });
    expect(decodeResourcesCursor(fetchResourcesFn.mock.calls[0][0].data.filter.cursor)).toEqual({
      anchor
    });
    expect(result.filter).toEqual({ types: ['动画'], limit: 30 });
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
    expect(setErrorResponse).not.toHaveBeenCalled();
    expect(setCacheControl).toHaveBeenCalled();
  });

  it('queries immediately without a cursor when no version is known', async () => {
    await loader({
      context: { queryClient },
      location: { href: 'https://animes.garden/resources?type=动画' }
    });
    expect(fetchResourcesFn.mock.calls[0][0].data.filter).toEqual({
      types: ['动画'],
      limit: 30,
      cursor: undefined
    });
    expect(fetchResourcesFn).toHaveBeenCalledOnce();
  });
});
