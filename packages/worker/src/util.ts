import { Context } from 'hono';
import { fullToHalf, tradToSimple } from 'simptrad';

export function normalizeTitle(title: string) {
  return fullToHalf(tradToSimple(title));
}

export function isNoCache(ctx: Context) {
  const cacheControl = ctx.req.header('cache-control');
  const noCache = cacheControl === 'no-cache' || cacheControl === 'no-store';
  return noCache;
}

export function createTimer(label: string) {
  let start = new Date();
  return {
    start() {
      start = new Date();
    },
    end() {
      const end = new Date();
      console.log(`${label}: ${((end.getTime() - start.getTime()) / 1000).toFixed(0)}ms`);
    }
  };
}
