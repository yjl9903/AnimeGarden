import type { Context, MiddlewareHandler } from 'hono';

import { type SitemapItem, SitemapStreamOptions, SitemapStream, streamToPromise } from 'sitemap';

export interface SitemapOptions {
  sitemap: SitemapStreamOptions;

  getURLs: (ctx: Context) => Promise<SitemapItem[] | undefined>;
}

export function sitemap(options: SitemapOptions): MiddlewareHandler {
  return async (ctx) => {
    const sms = new SitemapStream(options.sitemap);
    try {
      const items = await options.getURLs(ctx);
      if (items) {
        for (const item of items) {
          sms.write(item);
        }
        sms.end();

        const sitemapBuffer = await streamToPromise(sms);
        return new Response(sitemapBuffer, {
          headers: {
            'content-type': 'application/xml'
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
    return new Response(null, {
      status: 500
    });
  };
}
