import { describe, expect, it, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';

const { setCacheControl, setErrorResponse } = vi.hoisted(() => ({
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn()
}));

vi.mock('~/pages/anime/route', () => ({
  default: () => null
}));

vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl,
  setErrorResponse
}));

import { loader } from '../src/routes/calendar/$season';

describe('calendar season route loader', () => {
  it('loads historical calendar seasons', async () => {
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === 'timestamp') {
          return { ok: true, timestamp: new Date('2026-07-01T00:00:00.000Z') };
        }

        if (options.queryKey[1] === 'calendars') {
          return {
            ok: true,
            calendars: [
              { season: '2026-10', is_active: false, updated_at: new Date() },
              { season: '2026-07', is_active: true, updated_at: new Date() }
            ]
          };
        }

        if (options.queryKey[1] === 'calendar') {
          return { ok: true, calendar: [[{ id: 1 }]], season: '2026-10' };
        }

        throw new Error(`Unexpected query: ${options.queryKey.join('/')}`);
      })
    };

    await expect(
      loader({
        context: { queryClient: queryClient as unknown as QueryClient },
        params: { season: '2026-10' }
      })
    ).resolves.toMatchObject({
      calendar: [[{ id: 1 }]],
      calendars: [{ season: '2026-10' }, { season: '2026-07' }],
      season: '2026-10'
    });
    expect(setErrorResponse).not.toHaveBeenCalled();
    expect(queryClient.ensureQueryData).toHaveBeenCalledTimes(3);
  });
});
