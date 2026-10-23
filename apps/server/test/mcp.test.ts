import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeServer } from '../src/server/index';
import type { System } from '../src/system/index';

vi.mock('consola', () => {
  const stub: any = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'withTag') {
          return () => stub;
        }
        return vi.fn();
      }
    }
  );
  return { createConsola: () => stub };
});

function makeResource(index: number) {
  return {
    id: index + 1,
    provider: 'dmhy',
    providerId: `1000${index}`,
    title: `Test resource ${index}`,
    href: `https://share.dmhy.org/topics/view/1000${index}.html`,
    type: '动画',
    magnet: `magnet:?xt=urn:btih:${'a'.repeat(39)}${index}`,
    tracker: '',
    size: 1024 * (index + 1),
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
    fetchedAt: new Date('2026-03-01T00:00:00.000Z'),
    publisher: { id: 1, name: 'NekoPublisher' },
    fansub: { id: 2, name: 'LoliHouse' }
  };
}

const TEST_RESOURCES = [makeResource(0), makeResource(1), makeResource(2)];

let cleanup: (() => Promise<void>) | undefined;

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

/** Boots the server app with a mocked resources query and an MCP client routed over it. */
async function createConnectedClient() {
  const find = vi.fn(async () => ({
    resources: TEST_RESOURCES,
    hasMore: false
  }));

  const sys = {
    options: { site: 'animes.garden' },
    logger: { info: vi.fn(), error: vi.fn() },
    initialize: vi.fn(),
    modules: { resources: { query: { find } } }
  } as unknown as System;

  const app = (await makeServer(sys, {})).hono;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    return await app.request(new Request(input, init));
  }) as typeof fetch;

  const client = new Client({ name: 'vitest-mcp-client', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost/mcp')));

  cleanup = async () => {
    try {
      await client.close();
    } catch {}
    globalThis.fetch = originalFetch;
  };

  return { client, find };
}

afterEach(async () => {
  if (cleanup) {
    await cleanup();
    cleanup = undefined;
  }
  vi.restoreAllMocks();
});

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

describe('mcp search_resources pagination', () => {
  it(
    'exposes page and pageSize in the tool input schema',
    async () => {
      const { client } = await createConnectedClient();

      const { tools } = await client.listTools();
      const tool = tools.find((t) => t.name === 'search_resources');
      expect(tool).toBeDefined();

      const properties = (tool!.inputSchema as any).properties;
      expect(properties.page.type).toBe('integer');
      expect(properties.page.description).toContain('starting from 1');
      expect(properties.pageSize.type).toBe('integer');
      expect(properties.pageSize.description).toContain('Default 30');
    },
    15 * 1000
  );

  it(
    'defaults to page 1 and pageSize 30 when pagination is omitted',
    async () => {
      const { client, find } = await createConnectedClient();

      const result = await client.callTool({ name: 'search_resources', arguments: {} });

      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith({}, { page: 1, pageSize: 30 });

      const structured = (result as any).structuredContent;
      expect(structured.resources).toHaveLength(TEST_RESOURCES.length);
      expect(structured.resources[0]).toMatchObject({
        provider: 'dmhy',
        providerId: '10000',
        href: 'https://animes.garden/detail/dmhy/10000',
        fansub: 'LoliHouse'
      });

      const text = JSON.parse((result as any).content[0].text);
      expect(text).toHaveLength(TEST_RESOURCES.length);
    },
    15 * 1000
  );

  it(
    'passes requested page and pageSize through to the query',
    async () => {
      const { client, find } = await createConnectedClient();

      const result = await client.callTool({
        name: 'search_resources',
        arguments: { search: ['Re:Zero'], page: 2, pageSize: 50 }
      });

      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith({ search: ['Re:Zero'] }, { page: 2, pageSize: 50 });

      const structured = (result as any).structuredContent;
      expect(structured.resources).toHaveLength(TEST_RESOURCES.length);
    },
    15 * 1000
  );

  it(
    'falls back to the server default page size when pageSize exceeds the maximum',
    async () => {
      const { client, find } = await createConnectedClient();

      await client.callTool({
        name: 'search_resources',
        arguments: { pageSize: 5000 }
      });

      // parseURLSearch resets pageSize above MaxRequestPageSize (1000) to the
      // client package DefaultPageSize (100), and page stays 1.
      expect(find).toHaveBeenCalledWith({}, { page: 1, pageSize: 100 });
    },
    15 * 1000
  );
});
