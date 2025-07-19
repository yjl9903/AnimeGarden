import type { Handler, Env } from 'hono';

import { getAssetFromKV, type Options } from '@cloudflare/kv-asset-handler';
import { createRequestHandler, type ServerBuild } from '@remix-run/cloudflare';

export interface RemixHandlerOptions {
  build: ServerBuild;

  manifest?: Options['ASSET_MANIFEST'];
}

export const remix = <E extends Env = any>(options: RemixHandlerOptions): Handler<E> => {
  const handleRemixRequest = createRequestHandler(options.build);

  return async (ctx) => {
    const waitUntil = ctx.executionCtx.waitUntil.bind(ctx.executionCtx);
    const passThroughOnException = ctx.executionCtx.passThroughOnException.bind(ctx.executionCtx);
    const request = ctx.req.raw;

    try {
      const url = new URL(request.url);
      const ttl = url.pathname.startsWith('/assets/')
        ? 60 * 60 * 24 * 365 // 1 year
        : 60; // 5 minutes
      return await getAssetFromKV(
        // @ts-ignore
        { request, waitUntil },
        {
          ASSET_NAMESPACE: (ctx.env as any)?.__STATIC_CONTENT,
          ASSET_MANIFEST: options.manifest,
          cacheControl: {
            browserTTL: ttl,
            edgeTTL: ttl
          }
        }
      );
    } catch (error) {
      // No-op
    }

    try {
      const loadContext = {
        cloudflare: {
          // This object matches the return value from Wrangler's
          // `getPlatformProxy` used during development via Remix's
          // `cloudflareDevProxyVitePlugin`:
          // https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy
          // @ts-ignore
          cf: request.cf,
          ctx: { waitUntil, passThroughOnException },
          caches,
          env: ctx.env
        }
      };
      return await handleRemixRequest(request, loadContext);
    } catch (error) {
      throw error;
    }
  };
};
