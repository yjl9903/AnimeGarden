import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isNotFound } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

const { setCacheControl, setErrorResponse } = vi.hoisted(() => ({
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn()
}));

vi.mock('~/pages/resources.($page)/route', () => ({
  default: () => null
}));

vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl,
  setErrorResponse
}));

import { loader, Route } from '../src/routes/resources/$page';

describe('resources route loader', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    'magnet:',
    'NaN',
    'Infinity',
    '-Infinity',
    '9007199254740992',
    '0',
    '-1',
    '0.5',
    '-1.5'
  ])(
    'rejects invalid page %s before querying and uses the non-cacheable 404 head',
    async (page) => {
      const ensureQueryData = vi.fn();
      let error: unknown;
      try {
        await loader({
          context: { queryClient: { ensureQueryData } as unknown as QueryClient },
          location: { href: `https://animes.garden/resources/${page}?subject=1` },
          params: { page }
        });
      } catch (cause) {
        error = cause;
      }

      expect(isNotFound(error)).toBe(true);
      expect(error).toMatchObject({
        data: { kind: 'page' },
        headers: { 'Cache-Control': 'no-store' }
      });
      expect(ensureQueryData).not.toHaveBeenCalled();
      expect(setCacheControl).not.toHaveBeenCalled();

      const head = Route.options.head!({
        match: { error }
      } as Parameters<NonNullable<typeof Route.options.head>>[0]);
      expect(head).toMatchObject({
        meta: expect.arrayContaining([
          expect.objectContaining({ name: 'robots', content: 'noindex,follow' })
        ]),
        links: []
      });
      expect(
        Route.options.headers!({ match: { error } } as Parameters<
          NonNullable<typeof Route.options.headers>
        >[0])
      ).toEqual({ 'Cache-Control': 'no-store' });
      expect(Route.options.notFoundComponent).toBeDefined();
    }
  );

  it.each([undefined, '2', '1.9'])('loads and builds canonical URLs for page %s', async (page) => {
    const expectedPage = page === '2' ? 2 : 1;
    const ensureQueryData = vi.fn(async (options: { queryKey: readonly unknown[] }) => {
      if (options.queryKey[1] === 'resources') {
        expect(options.queryKey[2]).toMatchObject({ page: expectedPage, pageSize: 30 });
        return { ok: true, resources: [], filter: {} };
      }
      if (options.queryKey[1] === 'calendar') return { ok: true, calendar: [] };
      throw new Error(`Unexpected query: ${options.queryKey.join('/')}`);
    });
    const data = await loader({
      context: { queryClient: { ensureQueryData } as unknown as QueryClient },
      location: { href: `https://animes.garden/resources/${page ?? '1'}` },
      params: { page }
    });

    expect(data.page).toBe(expectedPage);
    expect(ensureQueryData).toHaveBeenCalledTimes(2);
    const head = Route.options.head!({
      loaderData: data,
      match: {}
    } as Parameters<NonNullable<typeof Route.options.head>>[0]);
    expect(head).toMatchObject({
      links: [{ rel: 'canonical', href: `https://animes.garden/resources/${expectedPage}` }]
    });
  });

  it('returns not found for deep pagination even when a calendar is available', async () => {
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === 'resources') {
          return {
            ok: false,
            resources: [],
            pagination: undefined,
            filter: undefined,
            timestamp: new Date('2026-07-01T00:00:00.000Z'),
            error: {
              name: 'AnimeGardenError',
              message:
                '400 Bad Request https://api.animes.garden/resources?page=101&pageSize=100: Resources pagination is too deep.'
            }
          };
        }

        if (options.queryKey[1] === 'calendar') {
          return {
            ok: true,
            season: '2026-07',
            calendar: [[{ id: 1 }]]
          };
        }

        throw new Error(`Unexpected query: ${options.queryKey.join('/')}`);
      })
    };
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    let response: unknown;
    try {
      await loader({
        context: { queryClient: queryClient as unknown as QueryClient },
        location: { href: 'https://animes.garden/resources/101?pageSize=100' },
        params: { page: '101' }
      });
    } catch (error) {
      response = error;
    }

    expect(isNotFound(response)).toBe(true);
    expect(response).toMatchObject({
      data: { kind: 'page' },
      headers: { 'Cache-Control': 'no-store' }
    });
    const head = Route.options.head!({
      match: { error: response }
    } as Parameters<NonNullable<typeof Route.options.head>>[0]);
    expect(head).toMatchObject({
      meta: expect.arrayContaining([
        expect.objectContaining({ name: 'robots', content: 'noindex,follow' })
      ]),
      links: []
    });
    expect(error).not.toHaveBeenCalled();
    expect(setErrorResponse).not.toHaveBeenCalled();
    expect(setCacheControl).not.toHaveBeenCalled();

    error.mockRestore();
  });

  it('keeps other upstream failures as server errors', async () => {
    const upstreamError = { name: 'Error', message: 'Service unavailable' };
    const ensureQueryData = vi.fn(async (options: { queryKey: readonly unknown[] }) => {
      if (options.queryKey[1] === 'resources') {
        return { ok: false, resources: [], error: upstreamError };
      }
      if (options.queryKey[1] === 'calendar') return { ok: true, calendar: [] };
      throw new Error(`Unexpected query: ${options.queryKey.join('/')}`);
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        loader({
          context: { queryClient: { ensureQueryData } as unknown as QueryClient },
          location: { href: 'https://animes.garden/resources/2' },
          params: { page: '2' }
        })
      ).resolves.toMatchObject({ ok: false });
      expect(setErrorResponse).toHaveBeenCalledWith(500);
      expect(setCacheControl).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('https://animes.garden/resources/2', upstreamError);
    } finally {
      error.mockRestore();
    }
  });
});
