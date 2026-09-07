import { describe, expect, it, vi } from 'vitest';
import { isNotFound } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';

const { setCacheControl, setErrorResponse } = vi.hoisted(() => ({
  setCacheControl: vi.fn(),
  setErrorResponse: vi.fn()
}));

vi.mock('~/pages/detail.$provider.$providerId/route', () => ({ default: () => null }));
vi.mock('~/pages/collection.$hash/route', () => ({ default: () => null }));
vi.mock('~/pages/subject.$subject.($page)/route', () => ({ default: () => null }));

vi.mock('~/utils/response', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/utils/response')>()),
  setCacheControl,
  setErrorResponse
}));

import { loader as catchAllLoader } from '../src/routes/$';
import { loader as collectionLoader } from '../src/routes/collection/$hash/route';
import { loader as detailLoader } from '../src/routes/detail/$provider/$providerId/route';
import { loader as subjectLoader } from '../src/routes/subject/$subject/route';

async function captureError(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    return error;
  }
  throw new Error('Expected action to throw');
}

describe('HTML not-found routes', () => {
  it('uses a Router not-found response for unmatched paths', async () => {
    const error = await captureError(catchAllLoader);

    expect(isNotFound(error)).toBe(true);
    expect(error).toMatchObject({
      data: { kind: 'page' },
      headers: { 'Cache-Control': 'no-store' }
    });
  });

  it('uses not found for unsupported and missing resource details', async () => {
    const unsupported = await captureError(() =>
      detailLoader({
        context: { queryClient: {} as QueryClient },
        params: { provider: 'unknown', providerId: '1' }
      })
    );
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) =>
        options.queryKey[1] === 'detail'
          ? { ok: false, code: 'NOT_FOUND', resource: undefined }
          : { ok: true, calendar: [] }
      )
    };
    const missing = await captureError(() =>
      detailLoader({
        context: { queryClient: queryClient as unknown as QueryClient },
        params: { provider: 'dmhy', providerId: 'missing' }
      })
    );

    expect(isNotFound(unsupported)).toBe(true);
    expect(isNotFound(missing)).toBe(true);
    expect(missing).toMatchObject({ data: { kind: 'resource' } });
  });

  it('does not convert upstream detail failures into 404s', async () => {
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) =>
        options.queryKey[1] === 'detail'
          ? { ok: false, code: 'SERVER_ERROR', resource: undefined }
          : { ok: true, calendar: [] }
      )
    };
    const error = await captureError(() =>
      detailLoader({
        context: { queryClient: queryClient as unknown as QueryClient },
        params: { provider: 'dmhy', providerId: 'unavailable' }
      })
    );

    expect(isNotFound(error)).toBe(false);
    expect(error).toBeInstanceOf(Error);
  });

  it('distinguishes missing collections from collection service failures', async () => {
    const missingClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) =>
        options.queryKey[1] === 'collection'
          ? { ok: false, code: 'NOT_FOUND' }
          : { ok: true, calendar: [] }
      )
    };
    const failedClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) =>
        options.queryKey[1] === 'collection'
          ? { ok: false, code: 'SERVER_ERROR' }
          : { ok: true, calendar: [] }
      )
    };

    const missing = await captureError(() =>
      collectionLoader({
        context: { queryClient: missingClient as unknown as QueryClient },
        params: { hash: 'missing' }
      })
    );
    const failed = await captureError(() =>
      collectionLoader({
        context: { queryClient: failedClient as unknown as QueryClient },
        params: { hash: 'unavailable' }
      })
    );

    expect(isNotFound(missing)).toBe(true);
    expect(missing).toMatchObject({ data: { kind: 'collection' } });
    expect(isNotFound(failed)).toBe(false);
    expect(failed).toBeInstanceOf(Error);
  });

  it('uses the shared not-found path for missing Subjects', async () => {
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === 'subject') {
          return { ok: false, code: 'NOT_FOUND', subject: undefined };
        }
        if (options.queryKey[1] === 'resources') return { ok: true, resources: [] };
        if (options.queryKey[1] === 'calendar') return { ok: true, calendar: [] };
        throw new Error(`Unexpected query: ${options.queryKey.join('/')}`);
      })
    };
    const missing = await captureError(() =>
      subjectLoader({
        context: { queryClient: queryClient as unknown as QueryClient },
        location: { href: 'https://animes.garden/subject/999', searchStr: '' },
        params: { subject: '999' }
      })
    );

    expect(isNotFound(missing)).toBe(true);
    expect(missing).toMatchObject({ data: { kind: 'subject' } });
  });

  it('does not convert upstream Subject failures into 404s', async () => {
    const queryClient = {
      ensureQueryData: vi.fn(async (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === 'subject') {
          return {
            ok: false,
            code: 'SERVER_ERROR',
            subject: undefined,
            error: { name: 'Error', message: 'upstream unavailable' }
          };
        }
        if (options.queryKey[1] === 'resources') return { ok: true, resources: [] };
        if (options.queryKey[1] === 'calendar') return { ok: true, calendar: [] };
        throw new Error(`Unexpected query: ${options.queryKey.join('/')}`);
      })
    };
    const error = await captureError(() =>
      subjectLoader({
        context: { queryClient: queryClient as unknown as QueryClient },
        location: { href: 'https://animes.garden/subject/999', searchStr: '' },
        params: { subject: '999' }
      })
    );

    expect(isNotFound(error)).toBe(false);
    expect(error).toMatchObject({ message: 'upstream unavailable' });
  });

  it('returns not found for an invalid Subject id without querying the API', async () => {
    const ensureQueryData = vi.fn();
    const missing = await captureError(() =>
      subjectLoader({
        context: { queryClient: { ensureQueryData } as unknown as QueryClient },
        location: { href: 'https://animes.garden/subject/invalid', searchStr: '' },
        params: { subject: 'invalid' }
      })
    );

    expect(isNotFound(missing)).toBe(true);
    expect(ensureQueryData).not.toHaveBeenCalled();
  });
});
