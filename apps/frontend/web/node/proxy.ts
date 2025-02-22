import type { Handler } from 'hono';

import type { Bindings } from './types';

import { env } from './env';

const SERVER_URL = new URL(env().SERVER_URL);

export const api = <E extends { Bindings: Bindings } = { Bindings: Bindings }>(): Handler<E> => {
  return async (ctx) => {
    const url = new URL(ctx.req.url);

    url.protocol = SERVER_URL.protocol;
    url.host = SERVER_URL.host;
    url.port = SERVER_URL.port;

    url.pathname = SERVER_URL.pathname
      ? url.pathname.replace(/^\/api\/?/, SERVER_URL.pathname)
      : url.pathname.replace(/^\/api/, '');

    try {
      const now = performance.now();
      console.info(`--> ${ctx.req.method} ${url.toString()}`);

      const request = ctx.req.raw;
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

    url.protocol = SERVER_URL.protocol;
    url.host = SERVER_URL.host;
    url.port = SERVER_URL.port;

    try {
      const now = performance.now();
      console.info(`--> ${ctx.req.method} ${url.toString()}`);

      const request = ctx.req.raw;
      const subRequest = new Request(url, request.clone());
      const subResponse = await fetch(subRequest);
      const response = subResponse.clone();
      const body = await response.text();

      console.info(
        `<-- ${ctx.req.method} ${url.toString()} ${response.status} ${Math.floor(performance.now() - now)}ms`
      );

      return new Response(body, {
        headers: {
          'content-type': response.headers.get('content-type') || 'application/rss+xml',
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
