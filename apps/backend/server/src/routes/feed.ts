import { etag } from 'hono/etag';
import { toDate } from 'date-fns-tz';

import { generateFilterShortTitle, parseURLSearch } from '@animegarden/client';

import { getRssString } from '../rss';
import { defineHandler } from '../utils/hono';

export const defineFeedRoutes = defineHandler((sys, app) =>
  app
    .get('/feed.xml', etag(), async (ctx) => {
      const url = new URL(ctx.req.url);
      sys.logger.info(`Receive feed.xml search params: ${url.search}`);

      const filter = parseURLSearch(url.searchParams, await ctx.req.json().catch(() => undefined));
      if (!filter) {
        return ctx.json({ status: 'ERROR', message: 'Request is not valid' }, 400);
      }

      const resp = await sys.modules.resources.query.find(filter);

      ctx.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
      ctx.res.headers.set('Cache-Control', `public, max-age=${1 * 60 * 60}`);

      return ctx.body(
        await getRssString({
          title: generateFilterShortTitle(filter),
          description:
            'Anime Garden 是動漫花園資源網的第三方镜像站, 動漫花園資訊網是一個動漫愛好者交流的平台,提供最及時,最全面的動畫,漫畫,動漫音樂,動漫下載,BT,ED,動漫遊戲,資訊,分享,交流,讨论.',
          site: `https://${sys.options.site ?? 'animes.garden'}`,
          trailingSlash: false,
          items: resp.resources.map((r) => {
            return {
              title: r.title,
              pubDate: toDate(r.createdAt, { timeZone: 'Asia/Shanghai' }),
              link: `https://${sys.options.site ?? 'animes.garden'}${getDetailURL(r)}`,
              enclosure: {
                url: r.magnet,
                length: r.size,
                type: 'application/x-bittorrent'
              }
            };
          })
        })
      );
    })
    .get('/collection/:hash/feed.xml', etag(), async (ctx) => {
      const hsh = ctx.req.param('hash');
      if (!hsh) {
        return ctx.json({ status: 'ERROR', message: 'Request is not valid' }, 400);
      }

      const resp = await sys.modules.collections.getCollection(hsh);
      if (!resp) {
        return ctx.json({ status: 'ERROR', message: `Unknown collection ${hsh}` }, 400);
      }

      ctx.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
      ctx.res.headers.set('Cache-Control', `public, max-age=${1 * 60 * 60}`);

      return ctx.body(
        await getRssString({
          title: `收藏夹 ${hsh}`,
          description:
            'Anime Garden 是動漫花園資源網的第三方镜像站, 動漫花園資訊網是一個動漫愛好者交流的平台,提供最及時,最全面的動畫,漫畫,動漫音樂,動漫下載,BT,ED,動漫遊戲,資訊,分享,交流,讨论.',
          site: `https://${sys.options.site ?? 'animes.garden'}`,
          trailingSlash: false,
          items: resp.resources.map((r) => {
            return {
              title: r.title,
              pubDate: toDate(r.createdAt, { timeZone: 'Asia/Shanghai' }),
              link: `https://${sys.options.site ?? 'animes.garden'}${getDetailURL(r)}`,
              enclosure: {
                url: r.magnet,
                length: r.size,
                type: 'application/x-bittorrent'
              }
            };
          })
        })
      );
    })
);

function getDetailURL(r: { provider: string; providerId: string }) {
  return `/detail/${r.provider}/${r.providerId}`;
}
