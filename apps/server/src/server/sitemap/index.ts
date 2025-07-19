import type { Context, MiddlewareHandler } from 'hono';

import { SitemapIndexStream, streamToPromise } from 'sitemap';

export * from './sitemap';

export interface SitemapIndexOptions {
  getUrls: (ctx: Context) => Promise<string[] | undefined>;
}

export function sitemapIndex(options: SitemapIndexOptions): MiddlewareHandler {
  return async (ctx) => {
    try {
      const smis = new SitemapIndexStream();
      const urls = await options.getUrls(ctx);
      if (urls && urls.length > 0) {
        for (const url of urls) {
          smis.write({ url });
        }
        smis.end();

        const sitemapBuffer = await streamToPromise(smis);
        return new Response(sitemapBuffer, {
          headers: {
            'content-type': 'application/xml'
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
    return new Response(null, {
      status: 500
    });
  };
}
