import type { Handler, Env } from 'hono';

import { createRequestHandler, type ServerBuild } from '@remix-run/node';

import { env } from './env';

export interface RemixHandlerOptions {
  build: ServerBuild;

  mode?: 'development' | 'production';
}

export const remix = <E extends Env = any>(options: RemixHandlerOptions): Handler<E> => {
  const handleRemixRequest = createRequestHandler(options.build, options.mode);

  return async (ctx) => {
    const request = ctx.req.raw;

    try {
      const loadContext = env(process.env);
      const response = await handleRemixRequest(request, loadContext);
      if (response.status < 400) {
        return response;
      }

      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, {
        headers,
        status: response.status,
        statusText: response.statusText
      });
    } catch (error) {
      console.error('[REMIX]', error);
      throw error;
    }
  };
};
