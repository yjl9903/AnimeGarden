import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';

vi.mock('~/pages/_index/route', () => ({
  default: () => null
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
});
