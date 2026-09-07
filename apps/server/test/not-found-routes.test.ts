import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScraperProviders } from '../src/providers/index';
import { DmhyProvider } from '../src/providers/scraper/dmhy';
import { defineCollectionsRoutes } from '../src/server/routes/collections';
import { defineResourcesRoutes } from '../src/server/routes/resources';
import type { AppEnv } from '../src/server/utils/hono';

const previousDmhyProvider = ScraperProviders.get('dmhy');

afterEach(() => {
  if (previousDmhyProvider) {
    ScraperProviders.set('dmhy', previousDmhyProvider);
  } else {
    ScraperProviders.delete('dmhy');
  }
});

describe('missing API resources', () => {
  it.each(['detail', 'resource'])(
    'returns HTTP 404 for a missing numeric DMHY id through /%s',
    async (route) => {
      ScraperProviders.set('dmhy', new DmhyProvider());
      const findFirst = vi.fn().mockResolvedValue(undefined);
      const getByProviderId = vi.fn();
      const app = new Hono<AppEnv>();
      defineResourcesRoutes(
        {
          database: { query: { resources: { findFirst } } },
          modules: { resources: { details: { getByProviderId } } }
        } as any,
        app
      );

      const response = await app.request(`http://localhost/${route}/dmhy/123456`);

      expect(response.status).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      await expect(response.json()).resolves.toMatchObject({
        status: 'ERROR',
        message: 'Unknown detail id: dmhy 123456'
      });
      expect(findFirst).toHaveBeenCalledOnce();
      expect(getByProviderId).not.toHaveBeenCalled();
    }
  );

  it.each(['detail', 'resource'])(
    'returns HTTP 500 for a DMHY lookup failure and retries after recovery through /%s',
    async (route) => {
      ScraperProviders.set('dmhy', new DmhyProvider());
      const databaseError = new Error('database unavailable');
      const findFirst = vi
        .fn()
        .mockRejectedValueOnce(databaseError)
        .mockResolvedValue({ href: 'https://share.dmhy.org/topics/view/123456.html' });
      const resource = { id: 1, provider: 'dmhy', providerId: '123456' };
      const getByProviderId = vi.fn().mockResolvedValue({ resource });
      const handleError = vi.fn();
      const app = new Hono<AppEnv>();
      app.onError((error, c) => {
        handleError(error);
        return c.json({ status: 'ERROR' }, 500);
      });
      defineResourcesRoutes(
        {
          database: { query: { resources: { findFirst } } },
          modules: { resources: { details: { getByProviderId } } }
        } as any,
        app
      );
      const url = `http://localhost/${route}/dmhy/123456`;

      const failedResponse = await app.request(url);
      expect(failedResponse.status).toBe(500);
      expect(handleError).toHaveBeenCalledExactlyOnceWith(databaseError);
      expect(getByProviderId).not.toHaveBeenCalled();

      // A transient database failure must not occupy the one-hour detail cache.
      const recoveredResponse = await app.request(url);
      expect(recoveredResponse.status).toBe(200);
      await expect(recoveredResponse.json()).resolves.toMatchObject({ status: 'OK', resource });
      expect(findFirst).toHaveBeenCalledTimes(2);

      // Successful responses retain their existing route-level caching behavior.
      const cachedResponse = await app.request(url);
      expect(cachedResponse.status).toBe(200);
      expect(findFirst).toHaveBeenCalledTimes(2);
      expect(getByProviderId).toHaveBeenCalledOnce();
    }
  );

  it('returns HTTP 404 for an unknown detail id', async () => {
    ScraperProviders.set('dmhy', {
      name: 'dmhy',
      getDetailURL: vi.fn().mockResolvedValue(undefined),
      fetchResourceDetail: vi.fn()
    } as any);
    const app = new Hono<AppEnv>();
    defineResourcesRoutes(
      {
        modules: {
          resources: {
            query: { find: vi.fn() },
            details: { getByProviderId: vi.fn() }
          }
        }
      } as any,
      app
    );

    const response = await app.request('http://localhost/detail/dmhy/missing');

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Unknown detail id: dmhy missing'
    });
  });

  it('returns HTTP 404 when a provider URL has no indexed resource', async () => {
    ScraperProviders.set('dmhy', {
      name: 'dmhy',
      getDetailURL: vi.fn().mockResolvedValue({
        provider: 'dmhy',
        providerId: 'missing',
        href: 'https://example.com/missing'
      }),
      fetchResourceDetail: vi.fn()
    } as any);
    const app = new Hono<AppEnv>();
    defineResourcesRoutes(
      {
        modules: {
          resources: {
            query: { find: vi.fn() },
            details: {
              getByProviderId: vi.fn().mockResolvedValue({
                resource: undefined,
                detail: undefined
              })
            }
          }
        }
      } as any,
      app
    );

    const response = await app.request('http://localhost/detail/dmhy/missing');

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({ status: 'ERROR' });
  });

  it('returns HTTP 404 for an unknown valid info hash', async () => {
    const app = new Hono<AppEnv>();
    defineResourcesRoutes(
      {
        modules: {
          resources: {
            query: { find: vi.fn() },
            details: {
              getByInfoHash: vi.fn().mockResolvedValue({
                resource: undefined,
                detail: undefined
              })
            }
          }
        }
      } as any,
      app
    );

    const response = await app.request(
      'http://localhost/detail/infohash/0123456789012345678901234567890123456789'
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({ status: 'ERROR' });
  });

  it('returns HTTP 404 for an unknown collection hash', async () => {
    const app = new Hono<AppEnv>();
    defineCollectionsRoutes(
      {
        modules: {
          collections: { getCollection: vi.fn().mockResolvedValue(undefined) }
        }
      } as any,
      app
    );

    const response = await app.request('http://localhost/collection/missing');

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({ status: 'ERROR' });
  });
});
