import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { defineCollectionsRoutes } from '../src/server/routes/collections';
import type { AppEnv } from '../src/server/utils/hono';

// 40 hex characters, matching the SHA-1 digests emitted by hashCollection().
const validHash = '0123456789012345678901234567890123456789';

const validPayload = {
  name: 'collection',
  authorization: 'secret',
  filters: [{ searchParams: 'keyword=test' }]
};

function createApp(system: Record<string, unknown>) {
  const app = new Hono<AppEnv>();
  defineCollectionsRoutes(system as any, app);
  return app;
}

describe('collection creation routes', () => {
  it.each(['post', 'put'] as const)(
    '%s returns HTTP 400 for an incorrect collection format',
    async (method) => {
      const generateCollection = vi.fn();
      const app = createApp({
        modules: { collections: { generateCollection } }
      });

      const response = await app.request('http://localhost/collection', {
        method: method.toUpperCase(),
        body: JSON.stringify({ name: 'missing filters' }),
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        status: 'ERROR',
        message: 'Incorrect collection format'
      });
      expect(generateCollection).not.toHaveBeenCalled();
    }
  );

  it.each(['post', 'put'] as const)(
    '%s returns HTTP 500 when generating a collection fails',
    async (method) => {
      const app = createApp({
        modules: {
          collections: { generateCollection: vi.fn().mockResolvedValue(undefined) }
        }
      });

      const response = await app.request('http://localhost/collection', {
        method: method.toUpperCase(),
        body: JSON.stringify(validPayload),
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({
        status: 'ERROR',
        message: 'Failed generating collection'
      });
    }
  );

  it('returns HTTP 500 when generating a collection throws', async () => {
    const generateCollection = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const app = createApp({
      modules: { collections: { generateCollection } }
    });

    const response = await app.request('http://localhost/collection', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Failed generating collection'
    });
  });

  it('returns HTTP 200 with the generated collection metadata', async () => {
    const gen = { id: 1, hash: validHash, createdAt: new Date('2024-01-01T00:00:00Z') };
    const app = createApp({
      modules: {
        collections: { generateCollection: vi.fn().mockResolvedValue(gen) }
      }
    });

    const response = await app.request('http://localhost/collection', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'OK',
      id: 1,
      hash: validHash
    });
  });
});

describe('collection query route', () => {
  it('returns HTTP 400 for an invalid collection hash', async () => {
    const getCollection = vi.fn();
    const app = createApp({
      modules: { collections: { getCollection } }
    });

    const response = await app.request('http://localhost/collection/missing');

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Invalid collection hash'
    });
    expect(getCollection).not.toHaveBeenCalled();
  });

  it('returns HTTP 404 for an unknown collection hash', async () => {
    const app = createApp({
      modules: {
        collections: { getCollection: vi.fn().mockResolvedValue(undefined) }
      }
    });

    const response = await app.request(`http://localhost/collection/${validHash}`);

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: `Collection not found: ${validHash}`
    });
  });

  it('returns HTTP 500 when a collection query fails', async () => {
    const queryError = new Error('database unavailable');
    const loggerError = vi.fn();
    const app = createApp({
      logger: { error: loggerError },
      modules: {
        collections: { getCollection: vi.fn().mockRejectedValue(queryError) }
      }
    });

    const response = await app.request(`http://localhost/collection/${validHash}`);

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Failed querying collection result'
    });
    expect(loggerError).toHaveBeenCalledExactlyOnceWith(queryError);
  });

  it('returns HTTP 200 with a short shared cache for a found collection', async () => {
    const app = createApp({
      modules: {
        collections: {
          getCollection: vi
            .fn()
            .mockResolvedValue({ hash: validHash, name: 'collection', results: [] })
        }
      }
    });

    const response = await app.request(`http://localhost/collection/${validHash}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    await expect(response.json()).resolves.toMatchObject({
      status: 'OK',
      hash: validHash
    });
  });
});
