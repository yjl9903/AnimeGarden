import { describe, expect, it, vi } from 'vitest';

import { makeServer } from '../src/server';

describe('API status discovery', () => {
  it.each([undefined, 'docs.example.com'])(
    'uses the configured site %s for links',
    async (site) => {
      const timestamp = new Date('2026-10-09T00:00:00.000Z');
      const provider = { id: 'ani', name: 'ANi', isActive: true };
      const server = await makeServer(
        {
          initialize: vi.fn(),
          logger: { info: vi.fn(), error: vi.fn() },
          modules: {
            providers: { timestamp, providers: new Map([['ani', provider]]) }
          },
          options: { site }
        } as any,
        {}
      );

      const response = await server.hono.request('https://api.example.com/');
      const status = {
        status: 'OK',
        timestamp: timestamp.toISOString(),
        providers: { ani: provider }
      };
      const siteUrl = `https://${site ?? 'animes.garden'}`;

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ...status,
        links: {
          openapi: `${siteUrl}/openapi.json`,
          llms: `${siteUrl}/llms.txt`
        }
      });

      const health = await server.hono.request('/health');
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual(status);
    }
  );
});
