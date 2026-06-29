import type { Context, MiddlewareHandler } from 'hono';

import { SitemapIndexStream, streamToPromise } from 'sitemap';

export * from './sitemap.ts';

export interface SitemapIndexOptions {
  getUrls: (ctx: Context) => Promise<string[] | undefined>;
}

/** Builds a sitemap index XML response from absolute sitemap URLs. */
export async function sitemapIndexResponse(urls: string[] | undefined) {
  try {
    const smis = new SitemapIndexStream();
    if (urls && urls.length > 0) {
      for (const url of urls) {
        smis.write({ url });
      }
      smis.end();

      const sitemapBuffer = await streamToPromise(smis);

      // @ts-ignore
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
}

export function sitemapIndex(options: SitemapIndexOptions): MiddlewareHandler {
  return async (ctx) => {
    try {
      return sitemapIndexResponse(await options.getUrls(ctx));
    } catch (error) {
      console.error(error);
      return new Response(null, {
        status: 500
      });
    }
  };
}
