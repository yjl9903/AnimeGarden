import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { makeServer } from '../src/server';
import { apiRobotsTxt, defineRobotsRoutes } from '../src/server/routes/robots';
import type { AppEnv } from '../src/server/utils/hono';

describe('API robots.txt', () => {
  it('disallows crawling the complete API hostname', async () => {
    const app = new Hono<AppEnv>();
    defineRobotsRoutes(app);

    const response = await app.request('https://api.animes.garden/robots.txt');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(await response.text()).toBe(apiRobotsTxt);
    expect(apiRobotsTxt).toContain('User-agent: *\nDisallow: /');
  });

  it('serves robots.txt without initializing API modules', async () => {
    const initialize = vi.fn();
    const server = await makeServer(
      {
        initialize,
        logger: { info: vi.fn(), error: vi.fn() },
        modules: {
          providers: { timestamp: new Date(), providers: new Map() }
        },
        options: {}
      } as any,
      {}
    );

    const response = await server.hono.request('https://api.animes.garden/robots.txt');

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(initialize).not.toHaveBeenCalled();
  });

  it('marks JSON, XML, cached, redirect, and error responses as noindex', async () => {
    const find = vi.fn().mockResolvedValue({ resources: [] });
    const server = await makeServer(
      {
        initialize: vi.fn(),
        logger: { info: vi.fn(), error: vi.fn() },
        modules: {
          providers: { timestamp: new Date(), providers: new Map() },
          resources: { query: { find } }
        },
        options: {}
      } as any,
      {}
    );

    const json = await server.hono.request('/health');
    expect(json.status).toBe(200);
    expect(json.headers.get('Content-Type')).toContain('application/json');
    expect(json.headers.get('X-Robots-Tag')).toBe('noindex');

    const xml = await server.hono.request('/feed.xml');
    expect(xml.status).toBe(200);
    expect(xml.headers.get('Content-Type')).toContain('application/xml');
    expect(xml.headers.get('X-Robots-Tag')).toBe('noindex');

    const cached = await server.hono.request('/feed.xml', {
      headers: { 'If-None-Match': xml.headers.get('ETag')! }
    });
    expect(cached.status).toBe(304);
    expect(cached.headers.get('X-Robots-Tag')).toBe('noindex');

    const redirect = await server.hono.request('/.well-known/mcp/server-card.json');
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get('X-Robots-Tag')).toBe('noindex');

    const missing = await server.hono.request('/missing');
    expect(missing.status).toBe(404);
    expect(missing.headers.get('X-Robots-Tag')).toBe('noindex');

    find.mockRejectedValueOnce(new Error('Query failed'));
    const error = await server.hono.request('/feed.xml');
    expect(error.status).toBe(500);
    expect(error.headers.get('X-Robots-Tag')).toBe('noindex');
  });
});
