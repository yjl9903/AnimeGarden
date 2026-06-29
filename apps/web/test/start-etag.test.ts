import { describe, expect, it } from 'vitest';

import { startInstance } from '../src/start';

type HandlerType = 'router' | 'serverFn';

interface RunEtagMiddlewareOptions {
  handlerType?: HandlerType;

  method?: string;

  requestHeaders?: HeadersInit;

  response: Response;
}

async function runEtagMiddleware({
  handlerType = 'router',
  method = 'GET',
  requestHeaders,
  response
}: RunEtagMiddlewareOptions) {
  const request = new Request('https://animes.garden/test', {
    method,
    headers: requestHeaders
  });
  const pathname = new URL(request.url).pathname;
  const startOptions = await startInstance.getOptions();
  const requestMiddleware = startOptions.requestMiddleware;
  if (!requestMiddleware) {
    throw new Error('Expected Start request middleware to be registered');
  }

  expect(requestMiddleware).toHaveLength(3);

  const etagMiddleware = requestMiddleware[1];
  const server = etagMiddleware.options.server as (ctx: {
    request: Request;
    pathname: string;
    handlerType: HandlerType;
    context: undefined;
    next: () => Promise<{
      request: Request;
      pathname: string;
      context: undefined;
      response: Response;
    }>;
  }) => Promise<{ response: Response }>;

  const result = await server({
    request,
    pathname,
    handlerType,
    context: undefined,
    next: async () => ({
      request,
      pathname,
      context: undefined,
      response
    })
  });

  return result.response;
}

describe('TanStack Start ETag middleware', () => {
  it('generates an ETag for router GET 200 responses', async () => {
    const response = await runEtagMiddleware({
      response: new Response('hello', {
        headers: {
          'content-type': 'text/plain; charset=UTF-8'
        }
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('etag')).toMatch(/^"[0-9a-f]+"$/);
    expect(await response.text()).toBe('hello');
  });

  it('returns 304 and retained cache headers when If-None-Match matches', async () => {
    const first = await runEtagMiddleware({
      response: new Response('hello', {
        headers: {
          'cache-control': 'public, max-age=60',
          'content-type': 'text/plain; charset=UTF-8',
          vary: 'Accept'
        }
      })
    });
    const etag = first.headers.get('etag');

    const second = await runEtagMiddleware({
      requestHeaders: {
        'If-None-Match': etag!
      },
      response: new Response('hello', {
        headers: {
          'cache-control': 'public, max-age=60',
          'content-type': 'text/plain; charset=UTF-8',
          vary: 'Accept'
        }
      })
    });

    expect(second.status).toBe(304);
    expect(second.headers.get('etag')).toBe(etag);
    expect(second.headers.get('cache-control')).toBe('public, max-age=60');
    expect(second.headers.get('vary')).toBe('Accept');
    expect(second.headers.get('content-type')).toBeNull();
    expect(await second.text()).toBe('');
  });

  it('does not handle server functions, HEAD/non-GET methods, non-200 responses, or HTML', async () => {
    const serverFn = await runEtagMiddleware({
      handlerType: 'serverFn',
      response: new Response('server fn')
    });
    const head = await runEtagMiddleware({
      method: 'HEAD',
      response: new Response(null, {
        headers: {
          'content-type': 'application/xml; charset=UTF-8'
        }
      })
    });
    const post = await runEtagMiddleware({
      method: 'POST',
      response: new Response('post')
    });
    const missing = await runEtagMiddleware({
      response: new Response('missing', { status: 404 })
    });
    const html = await runEtagMiddleware({
      response: new Response('<!doctype html><html></html>', {
        headers: {
          'content-type': 'text/html; charset=UTF-8'
        }
      })
    });

    expect(serverFn.headers.get('etag')).toBeNull();
    expect(head.headers.get('etag')).toBeNull();
    expect(post.headers.get('etag')).toBeNull();
    expect(missing.headers.get('etag')).toBeNull();
    expect(html.headers.get('etag')).toBeNull();
    expect(await serverFn.text()).toBe('server fn');
    expect(await head.text()).toBe('');
    expect(await post.text()).toBe('post');
    expect(await missing.text()).toBe('missing');
    expect(await html.text()).toBe('<!doctype html><html></html>');
  });

  it('handles markdown and sitemap-like router responses', async () => {
    const markdown = await runEtagMiddleware({
      response: new Response('# Anime Garden', {
        headers: {
          'content-type': 'text/markdown; charset=UTF-8'
        }
      })
    });
    const sitemap = await runEtagMiddleware({
      response: new Response('<urlset />', {
        headers: {
          'content-type': 'application/xml; charset=UTF-8'
        }
      })
    });

    expect(markdown.headers.get('etag')).toMatch(/^"[0-9a-f]+"$/);
    expect(sitemap.headers.get('etag')).toMatch(/^"[0-9a-f]+"$/);
  });
});
