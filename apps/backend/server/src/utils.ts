import { Context } from 'hono';

export function isNoCache(ctx: Context) {
  const cacheControl = ctx.req.header('cache-control');
  const noCache = cacheControl === 'no-cache' || cacheControl === 'no-store';
  return noCache;
}
