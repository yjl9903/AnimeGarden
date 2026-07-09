import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';

const { fetchResourcesFn, setCacheControl, setErrorResponse } = vi.hoisted(() => ({
  fetchResourcesFn: vi.fn(async () => ({
    ok: true,
    resources: [],
    timestamp: new Date('2026-07-01T00:00:00.000Z'),
    error: undefined
  })),
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn()
}));

vi.mock('~/pages/_index/route', () => ({
  default: () => null
}));

vi.mock('../src/query/proxy', () => ({
  fetchResourcesFn,
  fetchTimestampFn: vi.fn(),
  fetchResourceDetailFn: vi.fn(),
  fetchCollectionFn: vi.fn(),
  generateCollectionFn: vi.fn()
}));

vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl,
  setErrorResponse
}));

import { loader } from '../src/routes/index';

describe('index route loader', () => {
  it('redirects to latest calendar when home resources are unavailable', async () => {
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === 'resources') {
          return {
            ok: false,
            resources: [],
            timestamp: new Date('2026-07-01T00:00:00.000Z'),
            error: new Error('resources unavailable')
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    let response: unknown;
    try {
      await loader({
        context: { queryClient: queryClient as unknown as QueryClient },
        location: { href: 'https://animes.garden/' }
      });
    } catch (error) {
      response = error;
    }

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(307);
    expect((response as Response).headers.get('Location')).toBe('/calendar/2026-07');
    expect(warn).toHaveBeenCalledWith(
      '[Home]',
      'redirect to calendar fallback',
      expect.objectContaining({ season: '2026-07', resourcesOk: false })
    );

    warn.mockRestore();
    error.mockRestore();
  });

  it('loads home resources with the short fallback timeout', async () => {
    fetchResourcesFn.mockClear();

    const queryClient = {
      ensureQueryData: vi.fn(
        async (options: { queryKey: readonly unknown[]; queryFn?: unknown }) => {
          if (options.queryKey[1] === 'resources') {
            expect(options.queryFn).toEqual(expect.any(Function));
            await (options.queryFn as (input: { signal?: AbortSignal }) => unknown)({});

            return {
              ok: true,
              resources: [{ id: 1 }],
              timestamp: new Date('2026-07-01T00:00:00.000Z'),
              error: undefined
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
        }
      )
    };

    await loader({
      context: { queryClient: queryClient as unknown as QueryClient },
      location: { href: 'https://animes.garden/' }
    });

    expect(fetchResourcesFn).toHaveBeenCalledWith({
      data: {
        filter: expect.objectContaining({ page: 1, pageSize: 30, preset: 'bangumi' }),
        timeout: 5000
      },
      signal: undefined
    });
  });
});
