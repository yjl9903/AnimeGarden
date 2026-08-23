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
    expect(initialize).not.toHaveBeenCalled();
  });
});
