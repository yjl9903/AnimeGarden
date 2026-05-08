import type { Handler } from 'hono';

import type { Bindings } from './types';

import { env } from './env';

const FEED_SERVER_URL = new URL(env().FEED_SERVER_URL);

function getCacheControl(request: Request, response: Response) {
  // Error responses must not be cached by browser, CDN, or Hono/Worker cache layers.
  if (response.status >= 400) {
    return 'no-store';
  }

  const upstreamCacheControl = response.headers.get('cache-control');
  if (upstreamCacheControl) {
    return upstreamCacheControl;
  }

  return request.method === 'GET' ? 'public, max-age=300' : 'no-store';
}

function getCorsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Cache-Control, Authorization'
  };
}

function getProxyErrorResponse(error: unknown) {
  return new Response(
    JSON.stringify({
      status: 'ERROR',
      message: (error as any)?.message ?? 'unknown'
    }),
    {
      status: 500,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'cache-control': 'no-store',
        ...getCorsHeaders()
      }
    }
  );
}

export const api = <E extends { Bindings: Bindings } = { Bindings: Bindings }>(): Handler<E> => {
  return async (ctx) => {
    const url = new URL(ctx.req.url);

    url.protocol = FEED_SERVER_URL.protocol;
    url.host = FEED_SERVER_URL.host;
    url.port = FEED_SERVER_URL.port;

    url.pathname = FEED_SERVER_URL.pathname
      ? url.pathname.replace(/^\/api\/?/, FEED_SERVER_URL.pathname)
      : url.pathname.replace(/^\/api/, '');

    try {
      const now = performance.now();
      console.info(`--> ${ctx.req.method} ${url.toString()}`);

      const request = ctx.req.raw;
      // @ts-ignore
      const subRequest = new Request(url, request.clone());
      const subResponse = await fetch(subRequest);
      const response = subResponse.clone();
      const body = await response.text();

      console.info(
        `<-- ${ctx.req.method} ${url.toString()} ${response.status} ${Math.floor(performance.now() - now)}ms`
      );

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'cache-control': getCacheControl(request, response),
          ...getCorsHeaders()
        }
      });
    } catch (error) {
      console.error(error);

      return getProxyErrorResponse(error);
    }
  };
};

export const feed = <E extends { Bindings: Bindings } = { Bindings: Bindings }>(): Handler<E> => {
  return async (ctx) => {
    const url = new URL(ctx.req.url);

    url.protocol = FEED_SERVER_URL.protocol;
    url.host = FEED_SERVER_URL.host;
    url.port = FEED_SERVER_URL.port;

    try {
      const now = performance.now();
      console.info(`--> ${ctx.req.method} ${url.toString()}`);

      const request = ctx.req.raw;
      // @ts-ignore
      const subRequest = new Request(url, request.clone());
      const subResponse = await fetch(subRequest);
      const response = subResponse.clone();
      const body = await response.text();

      console.info(
        `<-- ${ctx.req.method} ${url.toString()} ${response.status} ${Math.floor(performance.now() - now)}ms`
      );

      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers.get('content-type') || 'application/xml',
          'cache-control': getCacheControl(request, response),
          ...getCorsHeaders()
        }
      });
    } catch (error) {
      console.error(error);

      return getProxyErrorResponse(error);
    }
  };
};
