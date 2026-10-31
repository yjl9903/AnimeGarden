import { HTTPException } from 'hono/http-exception';
import { StreamableHTTPTransport } from '@hono/mcp';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeServer } from '../src/server/index';

const { logs } = vi.hoisted(() => ({ logs: [] as Array<{ args: unknown[] }> }));
vi.mock('consola', async (importOriginal) => {
  const actual = await importOriginal<typeof import('consola')>();
  return {
    ...actual,
    createConsola: () =>
      actual.createConsola({ level: 5, reporters: [{ log: (entry) => logs.push(entry) }] })
  };
});

const find = vi.fn();
const providerTimestamp = new Date('2026-07-11T08:00:00.000Z');
let app: Awaited<ReturnType<typeof makeServer>>['hono'];

beforeAll(async () => {
  app = (
    await makeServer(
      {
        options: { site: 'animes.garden' },
        logger: { info: vi.fn(), error: vi.fn() },
        initialize: vi.fn(),
        modules: {
          providers: { timestamp: providerTimestamp },
          resources: { query: { find } }
        }
      } as any,
      {}
    )
  ).hono;
});
beforeEach(() => {
  find.mockReset().mockResolvedValue({
    resources: [],
    pagination: {
      anchor: providerTimestamp.getTime(),
      limit: 30,
      nextCursor: null,
      complete: true
    },
    filter: {}
  });
  logs.length = 0;
});
afterEach(() => vi.restoreAllMocks());

function rpcRequest(method = 'tools/list', params?: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  };
}

/** Reads the single SSE result emitted by the existing tools and initialization handler. */
async function readResult(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toContain('text/event-stream');
  const data = (await response.text()).split('\n').filter((line) => line.startsWith('data: '));
  expect(data).toHaveLength(1);
  return JSON.parse(data[0]!.slice(6));
}

describe('MCP requests', () => {
  it('redirects discovery to the web host', async () => {
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
    const response = await app.request('http://localhost/not-found');

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('supports initialization, notifications and subsequent calls without sessions', async () => {
    const initialized = await app.request(
      '/mcp',
      rpcRequest('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' }
      })
    );
    expect(initialized.status).toBe(200);
    expect(initialized.headers.get('mcp-session-id')).toBeNull();
    await expect(readResult(initialized)).resolves.toHaveProperty(
      'result.serverInfo.name',
      'animegarden'
    );
    const notification = await app.request('/mcp', {
      ...rpcRequest(),
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
    });
    expect(notification.status).toBe(202);
    const response = await app.request('/mcp', rpcRequest());
    await expect(readResult(response)).resolves.toHaveProperty('result.tools');
    expect((await app.request('/mcp', { method: 'OPTIONS' })).status).toBe(204);
  });

  it('isolates concurrent clients with the same RPC id and rejects GET/DELETE without interruption', async () => {
    const close = vi.spyOn(StreamableHTTPTransport.prototype, 'close');
    const first = Promise.withResolvers<{ resources: [] }>();
    const second = Promise.withResolvers<{ resources: [] }>();
    find.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const request = () =>
      app.request(
        '/mcp',
        rpcRequest('tools/call', {
          name: 'search_resources',
          arguments: {}
        })
      );
    const pendingFirst = request();
    await vi.waitFor(() => expect(find).toHaveBeenCalledTimes(1));
    const pendingSecond = request();
    await vi.waitFor(() => expect(find).toHaveBeenCalledTimes(2));
    expect(find.mock.calls.map(([, pagination]) => pagination)).toEqual([
      { limit: 30 },
      { limit: 30 }
    ]);
    for (const method of ['GET', 'DELETE', 'PUT']) {
      const response = await app.request('/mcp', { method });
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
    }
    // Finish the later request first; a tool failure must remain an HTTP 200 MCP error.
    second.resolve({ resources: [] });
    await expect(readResult(await pendingSecond)).resolves.toMatchObject({
      id: 1,
      result: { structuredContent: { resources: [] } }
    });
    first.reject(new Error('query failed'));
    const failed = await pendingFirst;
    expect(failed.status).toBe(200);
    await expect(readResult(failed)).resolves.toMatchObject({ id: 1, result: { isError: true } });
    await readResult(await app.request('/mcp', rpcRequest()));
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(3));
    expect(new Set(close.mock.contexts).size).toBe(3);
  });

  it('streams progress before the tool finishes and closes only after the final result', async () => {
    const start = vi.spyOn(StreamableHTTPTransport.prototype, 'start');
    const close = vi.spyOn(StreamableHTTPTransport.prototype, 'close');
    const result = Promise.withResolvers<{ resources: [] }>();
    find.mockReturnValueOnce(result.promise);
    const response = await app.request(
      '/mcp',
      rpcRequest('tools/call', {
        name: 'search_resources',
        arguments: {}
      })
    );
    const reader = response.body!.getReader();
    const progress = reader.read();
    const transport = start.mock.contexts[0] as StreamableHTTPTransport;
    await transport.send(
      {
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: { progressToken: 'test', progress: 1 }
      },
      { relatedRequestId: 1 }
    );
    expect(new TextDecoder().decode((await progress).value)).toContain('notifications/progress');
    expect(close).not.toHaveBeenCalled();
    result.resolve({ resources: [] });
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('structuredContent');
    expect((await reader.read()).done).toBe(true);
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it.each(['cancel', 'abort'] as const)('closes an unfinished SSE response on %s', async (mode) => {
    const close = vi.spyOn(StreamableHTTPTransport.prototype, 'close');
    const result = Promise.withResolvers<{ resources: [] }>();
    find.mockReturnValueOnce(result.promise);
    const abort = new AbortController();
    const response = await app.request('/mcp', {
      ...rpcRequest('tools/call', { name: 'search_resources', arguments: {} }),
      signal: abort.signal
    });
    expect(close).not.toHaveBeenCalled();
    if (mode === 'cancel') {
      await response.body!.cancel();
    } else {
      abort.abort();
      await expect(response.text()).rejects.toThrow();
    }
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
    result.resolve({ resources: [] });
  });

  it('closes the transport when the SSE body fails', async () => {
    const close = vi.spyOn(StreamableHTTPTransport.prototype, 'close');
    const error = new Error('stream failed');
    vi.spyOn(StreamableHTTPTransport.prototype, 'handleRequest').mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(error);
          }
        }),
        {
          headers: { 'Content-Type': 'text/event-stream' }
        }
      )
    );
    const response = await app.request('/mcp', rpcRequest());
    await expect(response.text()).rejects.toThrow('stream failed');
    await vi.waitFor(() => expect(close).toHaveBeenCalledOnce());
  });

  it.each([
    ['malformed JSON', { ...rpcRequest(), body: '{' }, 400],
    ['invalid JSON-RPC', { ...rpcRequest(), body: '{}' }, 400],
    [
      'unsupported protocol',
      {
        ...rpcRequest(),
        headers: { 'Content-Type': 'application/json', 'mcp-protocol-version': '1900-01-01' }
      },
      400
    ],
    ['invalid Accept', { ...rpcRequest(), headers: { Accept: 'application/xml' } }, 406],
    ['invalid Content-Type', { ...rpcRequest(), headers: { 'Content-Type': 'text/plain' } }, 415]
  ] as const)('preserves transport errors for %s', async (_name, request, status) => {
    const close = vi.spyOn(StreamableHTTPTransport.prototype, 'close');
    const response = await app.request('/mcp', request);
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({
      jsonrpc: '2.0',
      error: { code: expect.any(Number) },
      id: null
    });
    expect(find).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(logs).toContainEqual(
      expect.objectContaining({
        args: ['mcp request completed', expect.objectContaining({ status, errorStatus: status })]
      })
    );
  });

  it.each([404, 409] as const)('preserves HTTPException %s bodies and headers', async (status) => {
    vi.spyOn(StreamableHTTPTransport.prototype, 'handleRequest').mockRejectedValueOnce(
      new HTTPException(status, {
        res: new Response('protocol error', {
          status,
          headers: { 'X-Protocol-Error': 'preserved' }
        })
      })
    );
    const response = await app.request('/mcp', rpcRequest());
    expect(response.status).toBe(status);
    expect(response.headers.get('X-Protocol-Error')).toBe('preserved');
    await expect(response.text()).resolves.toBe('protocol error');
  });

  it('returns a generic 500 for unknown errors and closes the transport', async () => {
    vi.spyOn(StreamableHTTPTransport.prototype, 'handleRequest').mockRejectedValueOnce(
      new Error('private connection details')
    );
    const close = vi.spyOn(StreamableHTTPTransport.prototype, 'close');
    const response = await app.request('/mcp', rpcRequest());
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      status: 'ERROR',
      message: 'Internal server error'
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('keeps the result when cleanup fails and logs request context', async () => {
    vi.spyOn(StreamableHTTPTransport.prototype, 'close').mockRejectedValueOnce(
      new Error('cleanup')
    );
    const request = rpcRequest();
    const response = await app.request('/mcp', {
      ...request,
      headers: {
        ...request.headers,
        'X-Request-Id': 'mcp-test',
        'User-Agent': 'test-claude-client'
      }
    });
    expect(response.status).toBe(200);
    await expect(readResult(response)).resolves.toHaveProperty('result.tools');
    await vi.waitFor(() =>
      expect(logs).toContainEqual(
        expect.objectContaining({
          args: [
            'mcp request completed',
            expect.objectContaining({
              method: 'POST',
              status: 200,
              requestId: 'mcp-test',
              userAgent: 'test-claude-client',
              durationMs: expect.any(Number)
            })
          ]
        })
      )
    );
  });
});
