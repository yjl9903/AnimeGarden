import { describe, expect, it } from 'vitest';

import { Route } from '../src/routes/[.]well-known/mcp/server-card[.]json';

describe('mcp server card', () => {
  it('serves discovery metadata from the TanStack Start route', async () => {
    const response = await (Route.options.server!.handlers as any).GET({} as any);
    const card = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(card).toMatchObject({
      websiteUrl: 'https://animes.garden',
      serverInfo: {
        name: 'animegarden',
        version: expect.any(String)
      },
      transport: {
        type: 'streamable-http',
        endpoint: '/mcp',
        url: 'https://api.animes.garden/mcp'
      },
      capabilities: {
        tools: true,
        resources: true,
        prompts: false
      }
    });
    expect(card.remotes).toEqual([
      {
        type: 'streamable-http',
        url: 'https://api.animes.garden/mcp'
      }
    ]);
  });
});
