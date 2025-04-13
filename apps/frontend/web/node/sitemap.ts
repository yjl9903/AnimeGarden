import { Hono } from 'hono';
import { etag as honoEtag } from 'hono/etag';

import { fetchAPI } from '@animegarden/client';
import { sitemap, sitemapIndex } from '@animegarden/server';

import { env } from './env';
import { MemoryCacheStorage, cache as honoCache } from './caches';

const app = new Hono();
const storage = new MemoryCacheStorage();
const { APP_HOST, FEED_SERVER_URL } = env();

const SITE = `https://${APP_HOST}`;

const index = sitemapIndex({
  getUrls: async () => {
    // 1. static pages
    const pages = ['sitemap-0.xml', 'sitemap-fansubs.xml', 'sitemap-subjects.xml'];

    // 2. monthly detail
    const months: string[] = [];
    const now = new Date();
    const startYear = 2020;
    for (let y = startYear; y <= now.getFullYear(); y++) {
      for (let m = 0; m <= (y === now.getFullYear() ? now.getMonth() : 11); m++) {
        months.push(`sitemap-${y}-${String(m + 1).padStart(2, '0')}.xml`);
      }
    }

    return [...pages, ...months.reverse()].map((url) => `${SITE}/${url}`);
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

    try {
      if (url.pathname === '/sitemap-0.xml') {
        return [
          { url: `${SITE}/` },
          { url: `${SITE}/resources/1?type=动画` },
          { url: `${SITE}/resources/1?type=合集` },
          { url: `${SITE}/resources/1?type=音乐` },
          { url: `${SITE}/resources/1?type=日剧` },
          { url: `${SITE}/resources/1?type=RAW` },
          { url: `${SITE}/resources/1?type=漫画` },
          { url: `${SITE}/resources/1?type=游戏` },
          { url: `${SITE}/resources/1?type=特摄` },
          { url: `${SITE}/resources/1?type=其他` }
        ];
      } else if (url.pathname === '/sitemap-fansubs.xml') {
        const data = await fetchAPI<any>('teams', undefined, {
          baseURL: FEED_SERVER_URL,
          retry: 5
        });
        return data.teams.map((r: any) => ({
          url: `${SITE}/resources/1?fansub=${r.name}`
        }));
      } else if (url.pathname === '/sitemap-subjects.xml') {
        const data = await fetchAPI<any>('sitemaps/subjects', undefined, {
          baseURL: FEED_SERVER_URL,
          retry: 5
        });
        return data.subjects.map((r: any) => ({
          url: `${SITE}/subject/${r.id}/1`
        }));
      } else {
        const match = /\/sitemap-(\d{4})-(\d{1,2}).xml$/.exec(url.pathname);
        if (match) {
          const now = new Date();
          const year = +match[1];
          const month = +match[2];
          if (2020 <= year && year <= now.getFullYear()) {
            if (1 <= month && month <= (year < now.getFullYear() ? 12 : now.getMonth() + 1)) {
              const data: any = await fetchAPI(`sitemaps/${year}/${month}`, undefined, {
                baseURL: FEED_SERVER_URL,
                retry: 5
              });
              return data.resources.map((r: any) => ({
                url: `${SITE}/detail/${r.provider}/${r.providerId}`
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
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

app.get('/:sitemap{sitemap-[a-z0-9-]+\\.xml}', etag, cache, items);

export const sitemaps = app;
