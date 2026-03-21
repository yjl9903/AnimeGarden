import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { ResourcesSlowQueryBusyError, ResourcesSlowQueryTimeoutError } from '../src/error';
import { defineFeedRoutes } from '../src/server/routes/feed';
import { defineResourcesRoutes } from '../src/server/routes/resources';
import type { AppEnv } from '../src/server/utils/hono';
import {
  getResourcesQueryErrorResponse,
  getResourcesQueryErrorXml
} from '../src/server/utils/resources-query';

function bindSlowQueryErrorHandler(app: Hono<AppEnv>) {
  app.onError((error, c) => {
    const queryError = getResourcesQueryErrorResponse(error);
    if (queryError) {
      if (c.req.path.endsWith('/feed.xml')) {
        c.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
        c.res.headers.set('Cache-Control', 'no-store');
        return c.body(getResourcesQueryErrorXml(queryError.message), queryError.status);
      }

      return c.json(
        {
          status: 'ERROR',
          message: queryError.message
        },
        queryError.status
      );
    }

    return c.json({ status: 'ERROR' }, 500);
  });
}

function createSystem(error: Error) {
  return {
    options: {
      site: 'animes.garden'
    },
    modules: {
      resources: {
        query: {
          find: vi.fn().mockRejectedValue(error)
        }
      },
      collections: {
        getCollection: vi.fn()
      }
    }
  } as any;
}

function createFeedApp(error: Error) {
  const app = new Hono<AppEnv>();
  const sys = createSystem(error);

  defineFeedRoutes(sys, app);
  bindSlowQueryErrorHandler(app);

  return app;
}

function createResourcesApp(error: Error) {
  const app = new Hono<AppEnv>();
  const sys = createSystem(error);

  defineResourcesRoutes(sys, app);
  bindSlowQueryErrorHandler(app);

  return app;
}

describe('server slow query errors', () => {
  it('returns XML 503 when the slow query lane is busy', async () => {
    const app = createFeedApp(new ResourcesSlowQueryBusyError());

    const response = await app.request('http://localhost/feed.xml');

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.text()).resolves.toContain('<error>');
  });

  it('returns XML 504 when the slow query lane also times out', async () => {
    const app = createFeedApp(new ResourcesSlowQueryTimeoutError());

    const response = await app.request('http://localhost/feed.xml');

    expect(response.status).toBe(504);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.text()).resolves.toContain('<error>');
  });

  it('returns JSON 503 for /resources from the top-level error handler', async () => {
    const app = createResourcesApp(new ResourcesSlowQueryBusyError());

    const response = await app.request('http://localhost/resources');

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Resources slow database query is busy. Please retry later.'
    });
  });
});
