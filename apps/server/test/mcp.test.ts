import { describe, expect, it, vi } from 'vitest';

import { makeServer } from '../src/server/index';

async function createMcpApp() {
  const sys = {
    options: {
      site: 'animes.garden'
    },
    logger: {
      info: vi.fn(),
      error: vi.fn()
    },
    initialize: vi.fn()
  } as any;

  return (await makeServer(sys, {})).hono;
}

describe('mcp server card', () => {
  it('redirects discovery to the web host', async () => {
    const app = await createMcpApp();

    const response = await app.request('http://localhost/.well-known/mcp/server-card.json');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://animes.garden/.well-known/mcp/server-card.json'
    );
  });
});
