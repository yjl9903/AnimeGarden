import { describe, expect, it, vi } from 'vitest';
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

import { loader } from '../src/routes/resources/$page';

describe('resources route loader', () => {
  it('redirects deep pagination to the latest calendar', async () => {
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

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(307);
    expect((response as Response).headers.get('Location')).toBe('/calendar/2026-07');
    expect(error).not.toHaveBeenCalled();
    expect(setErrorResponse).not.toHaveBeenCalled();
    expect(setCacheControl).not.toHaveBeenCalled();

    error.mockRestore();
  });
});
