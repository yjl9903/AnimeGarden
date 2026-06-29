import type { Context, MiddlewareHandler } from 'hono';

import {
  type SitemapItemLoose,
  type SitemapStreamOptions,
  SitemapStream,
  streamToPromise
} from 'sitemap';

export type { SitemapItemLoose, SitemapStreamOptions } from 'sitemap';

export interface SitemapOptions {
  sitemap: SitemapStreamOptions;

  getURLs: (ctx: Context) => Promise<SitemapItemLoose[] | undefined>;
}

/** Builds a sitemap XML response from sitemap items. */
export async function sitemapResponse(
  options: SitemapStreamOptions,
  items: SitemapItemLoose[] | undefined
) {
  const sms = new SitemapStream(options);
  try {
    if (items && items.length > 0) {
      for (const item of items) {
        sms.write(item);
      }
      sms.end();

      const sitemapBuffer = await streamToPromise(sms);

      // @ts-ignore
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
}

export function sitemap(options: SitemapOptions): MiddlewareHandler {
  return async (ctx) => {
    try {
      return sitemapResponse(options.sitemap, await options.getURLs(ctx));
    } catch (error) {
      console.error(error);
      return new Response(null, {
        status: 500
      });
    }
  };
}
