import type { Handler, Env } from 'hono';

import { createRequestHandler, type ServerBuild } from '@remix-run/node';

export interface RemixHandlerOptions {
  build: ServerBuild;

  mode?: 'development' | 'production';
}

export const remix = <E extends Env = any>(options: RemixHandlerOptions): Handler<E> => {
  const handleRemixRequest = createRequestHandler(options.build, options.mode);

  return async (ctx) => {
    const request = ctx.req.raw;

    try {
      const loadContext = {};
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      throw error;
    }
  };
};
