import { describe, expect, it, vi } from 'vitest';

import { makeServer } from '../src/server/index';

async function createMcpApp() {
  const providerTimestamp = new Date('2026-07-11T08:00:00.000Z');
  const sys = {
    options: {
      site: 'animes.garden'
    },
    logger: {
      info: vi.fn(),
      error: vi.fn()
    },
    modules: {
      providers: {
        timestamp: providerTimestamp
      },
      resources: {
        query: {
          find: vi.fn().mockResolvedValue({
            resources: [],
            pagination: {
              anchor: providerTimestamp.getTime(),
              limit: 100,
              nextCursor: null,
              complete: true
            },
            filter: {}
          })
        }
      }
    },
    initialize: vi.fn()
  } as any;

  return { app: (await makeServer(sys, {})).hono, providerTimestamp };
}

describe('mcp server card', () => {
  it('redirects discovery to the web host', async () => {
    const { app, providerTimestamp } = await createMcpApp();
    const beforeRequest = Date.now();

    const response = await app.request(
      new Request('http://localhost/.well-known/mcp/server-card.json', {
        headers: { Origin: 'https://animes.garden' }
      })
    );
    const afterRequest = Date.now();

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://animes.garden/.well-known/mcp/server-card.json'
    );
    expect(response.headers.get('x-response-timestamp')).toBe(providerTimestamp.toISOString());

    const requestTimestamp = new Date(response.headers.get('x-request-timestamp')!).getTime();
    expect(requestTimestamp).toBeGreaterThanOrEqual(beforeRequest);
    expect(requestTimestamp).toBeLessThanOrEqual(afterRequest);
    expect(response.headers.get('access-control-expose-headers')).toContain('X-Request-Timestamp');
    expect(response.headers.get('access-control-expose-headers')).toContain('X-Response-Timestamp');
  });

  it('separates the request time from the provider data timestamp', async () => {
    const { app, providerTimestamp } = await createMcpApp();
    const beforeRequest = Date.now();

    const response = await app.request('http://localhost/resources');
    const afterRequest = Date.now();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-response-timestamp')).toBe(providerTimestamp.toISOString());
    const body = await response.json();
    expect(body).not.toHaveProperty('timestamp');
    expect(body).toMatchObject({
      pagination: {
        anchor: providerTimestamp.getTime()
      }
    });

    const requestTimestamp = new Date(response.headers.get('x-request-timestamp')!).getTime();
    expect(requestTimestamp).toBeGreaterThanOrEqual(beforeRequest);
    expect(requestTimestamp).toBeLessThanOrEqual(afterRequest);
  });

  it('prevents caching error responses', async () => {
    const { app } = await createMcpApp();

    const response = await app.request('http://localhost/not-found');

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
