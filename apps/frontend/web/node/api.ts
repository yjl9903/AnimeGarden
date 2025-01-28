import type { Handler } from 'hono';

import type { Bindings } from './types';

export const api = <E extends { Bindings: Bindings } = { Bindings: Bindings }>(): Handler<E> => {
  return async (ctx) => {
    const url = new URL(ctx.req.url);
    const { SERVER_PROTOCOL, SERVER_HOST, SERVER_PORT, SERVER_BASE } = ctx.env;

    if (SERVER_HOST) {
      url.protocol = SERVER_PROTOCOL + ':';
      url.host = SERVER_HOST;
      url.port = SERVER_PORT ?? '';
    }

    url.pathname = SERVER_BASE
      ? url.pathname.replace(/^\/api\/?/, SERVER_BASE)
      : url.pathname.replace(/^\/api/, '');

    try {
      const request = ctx.req.raw;
      const subRequest = new Request(url, request.clone());
      const response = await fetch(subRequest);

      return new Response(response.body, {
        headers: {
          'cache-control': request.method === 'GET' ? `public, max-age=300` : 'no-store',
          // @ts-ignore
          ...Object.fromEntries(response.headers.entries()),
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
