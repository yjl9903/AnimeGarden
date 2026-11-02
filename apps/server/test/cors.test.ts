import { describe, expect, it, vi } from 'vitest';
import { fetchResources } from '@animegarden/client';

import { FeedModule } from '../src/feed';
import { makeServer } from '../src/server';

describe('API CORS', () => {
  it('exposes response metadata on successful, cached, and failed cross-origin requests', async () => {
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const find = vi.fn().mockResolvedValue({ resources: [] });
    const sys = {
      initialize: vi.fn(),
      logger: { info: vi.fn(), error: vi.fn() },
      modules: {
        providers: { timestamp, providers: new Map() },
        resources: { query: { find } }
      },
      options: {}
    } as any;
    sys.modules.feed = new FeedModule(sys, FeedModule.name);
    const { hono } = await makeServer(sys, {});
    const headers = { Origin: 'https://example.com', 'X-Request-Id': 'cors-test' };

    const health = await hono.request('/health', { headers });
    expect(health.status).toBe(200);
    expect(health.headers.get('X-Response-Timestamp')).toBe(timestamp.toISOString());

    const feed = await hono.request('/feed.xml', { headers });
    expect(feed.status).toBe(200);
    const etag = feed.headers.get('ETag');
    expect(etag).toBeTruthy();
    const cached = await hono.request('/feed.xml', {
      headers: { ...headers, 'If-None-Match': etag! }
    });
    expect(cached.status).toBe(304);
    expect(cached.headers.get('ETag')).toBe(etag);

    // Resource routes use safeEtag rather than the feed's conditional-response handler.
    const resources = await hono.request('/resources', { headers });
    expect(resources.status).toBe(200);
    const cachedResources = await hono.request('/resources', {
      headers: { ...headers, 'If-None-Match': resources.headers.get('ETag')! }
    });
    expect(cachedResources.status).toBe(304);

    const mcp = await hono.request('/mcp', {
      method: 'POST',
      headers: {
        ...headers,
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    expect(mcp.status).toBe(200);
    expect(await mcp.text()).toContain('event: message');
    const methodError = await hono.request('/mcp', { headers });
    expect(methodError.status).toBe(405);

    const missing = await hono.request('/missing', { headers });
    expect(missing.status).toBe(404);
    find.mockRejectedValueOnce(new Error('Query failed'));
    await sys.modules.feed.refresh();
    const failed = await hono.request('/feed.xml', { headers });
    expect(failed.status).toBe(500);

    // In-process fetch does not enforce CORS; verify the browser-facing header contract.
    for (const response of [
      health,
      feed,
      cached,
      resources,
      cachedResources,
      mcp,
      methodError,
      missing,
      failed
    ]) {
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      const exposed = response.headers
        .get('Access-Control-Expose-Headers')
        ?.toLowerCase()
        .split(',')
        .map((header) => header.trim());
      expect(exposed).toEqual(
        expect.arrayContaining(['x-response-timestamp', 'x-request-id', 'etag'])
      );
      expect(response.headers.get('X-Request-Id')).toBe('cors-test');
      expect(response.headers.get('X-Response-Timestamp')).toBeTruthy();
    }

    for (const [path, method, requestedHeaders] of [
      ['/feed.xml', 'GET', 'if-none-match,x-request-id'],
      ['/resources', 'POST', 'content-type,x-trace-id'],
      ['/mcp', 'POST', 'authorization,content-type,mcp-protocol-version']
    ]) {
      sys.initialize.mockClear();
      const preflight = await hono.request(path, {
        method: 'OPTIONS',
        headers: {
          Origin: headers.Origin,
          'Access-Control-Request-Method': method,
          'Access-Control-Request-Headers': requestedHeaders
        }
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(preflight.headers.get('Access-Control-Allow-Methods')).toContain(method);
      expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe(requestedHeaders);
      expect(preflight.headers.get('Vary')).toContain('Access-Control-Request-Headers');
      expect(sys.initialize).not.toHaveBeenCalled();
    }
  });

  it('supports SDK resource validation with only browser-readable response headers', async () => {
    const { hono } = await makeServer(
      {
        initialize: vi.fn(),
        logger: { info: vi.fn(), error: vi.fn() },
        modules: {
          resources: {
            query: {
              find: vi.fn().mockResolvedValue({
                resources: [],
                pagination: { page: 1, pageSize: 20, complete: true },
                filter: {}
              })
            }
          }
        },
        options: {}
      } as any,
      {}
    );

    const result = await fetchResources({
      baseURL: 'https://api.animes.garden/',
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set('Origin', 'https://example.com');
        const response = await hono.request(String(input), { ...init, headers });
        expect(response.headers.get('X-Request-Id')).toBe(headers.get('X-Trace-Id'));
        expect(await response.clone().json()).not.toHaveProperty('timestamp');

        // Model CORS response-header filtering; Node fetch itself does not enforce it.
        const readableHeaders = new Headers();
        const exposed = response.headers.get('Access-Control-Expose-Headers')?.split(',') ?? [];
        for (const name of ['Content-Type', ...exposed]) {
          const value = response.headers.get(name.trim());
          if (value !== null) readableHeaders.set(name.trim(), value);
        }
        return new Response(response.body, { status: response.status, headers: readableHeaders });
      }
    });
    expect(result.ok).toBe(true);
    expect(result.timestamp).toBeInstanceOf(Date);

    const explicit = await hono.request('/missing', {
      headers: { 'X-Request-Id': 'request-id', 'X-Trace-Id': 'trace-id' }
    });
    expect(explicit.headers.get('X-Request-Id')).toBe('request-id');
    const generated = await hono.request('/missing');
    expect(generated.headers.get('X-Request-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
