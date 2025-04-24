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
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      console.error('[REMIX]', error);
      throw error;
    }
  };
};
