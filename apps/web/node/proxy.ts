import type { Handler } from 'hono';

import type { Bindings } from './types';

import { env } from './env';

const FEED_SERVER_URL = new URL(env().FEED_SERVER_URL);

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
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'cache-control':
            (response.headers.get('cache-control') ?? request.method === 'GET')
              ? `public, max-age=300`
              : '',
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'Content-Type, Cache-Control, Authorization'
        }
      });
    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          status: 'ERROR',
          message: (error as any)?.message ?? 'unknown'
        }),
        { status: 500 }
      );
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
        headers: {
          'content-type': response.headers.get('content-type') || 'application/xml',
          'cache-control': response.headers.get('cache-control') || `public, max-age=300`,
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'Content-Type, Cache-Control, Authorization'
        }
      });
    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          status: 'ERROR',
          message: (error as any)?.message ?? 'unknown'
        }),
        { status: 500 }
      );
    }
  };
};
