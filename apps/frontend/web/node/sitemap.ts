import { Hono } from 'hono';
import { etag as honoEtag } from 'hono/etag';

import { sitemap, sitemapIndex } from '@animegarden/server';

import { env } from './env';
import { MemoryCacheStorage, cache as honoCache } from './caches';

const app = new Hono();
const storage = new MemoryCacheStorage();
const { APP_HOST, SERVER_URL } = env();

const index = sitemapIndex({
  getUrls: async () => {
    // 1. static pages
    const pages = ['sitemap-0.xml', 'sitemap-subjects.xml'];

    // 2. monthly detail
    const months: string[] = [];
    const now = new Date();
    const startYear = 2020;
    for (let y = startYear; y <= now.getFullYear(); y++) {
      for (let m = 0; m <= (y === now.getFullYear() ? now.getMonth() : 11); m++) {
        months.push(`sitemap-${y}-${String(m + 1).padStart(2, '0')}.xml`);
      }
    }

    return [...pages, ...months.reverse()].map((url) => `https://${APP_HOST}/${url}`);
  }
});

const items = sitemap({
  sitemap: {
    hostname: `https://${APP_HOST}`,
    lastmodDateOnly: false,
    errorHandler: (e) => {
      console.error(e);
    }
  },
  async getURLs(ctx) {
    const url = new URL(ctx.req.url);

    if (url.pathname === '/sitemap-0.xml') {
    } else if (url.pathname === '/sitemap-subjects.xml') {
    } else {
      const match = /\/sitemap-(\d{4})-(\d{1,2}).xml$/.exec(url.pathname);
      if (match) {
        const now = new Date();
        const year = +match[1];
        const month = +match[2];
        if (2020 <= year && year <= now.getFullYear()) {
          if (1 <= month && month <= (year < now.getFullYear() ? 12 : now.getMonth() + 1)) {
            return [];
          }
        }
      }
    }

    return undefined;
  }
});

const etag = honoEtag();
const cache = honoCache({
  cacheName: 'sitemaps',
  cacheControl: 'max-age=86400',
  wait: true,
  caches: storage
});

app.get('/sitemap-index.xml', etag, cache, index);

app.get('/sitemap-0.xml', etag, cache, items);
app.get('/sitemap-subjects.xml', etag, cache, items);
app.get('/sitemap-:year{[0-9]+}-:month{[0-9]+}.xml', etag, cache, items);

export const sitemaps = app;
