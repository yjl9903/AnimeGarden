import { etag } from 'hono/etag';
import { toDate } from 'date-fns-tz';

import { parseURLSearch } from '@animegarden/client';

import { getRssString } from '../rss';
import { defineHandler } from '../utils/hono';
import { generateTitleFromFilter } from '../utils/meta';

export const defineFeedRoutes = defineHandler((sys, app) =>
  app
    .get('/feed.xml', etag(), async (ctx) => {
      const url = new URL(ctx.req.url);
      // sys.logger.info(`Receive feed.xml search params: ${url.search}`);

      const filter = parseURLSearch(url.searchParams, await ctx.req.json().catch(() => undefined));
      if (!filter) {
        return ctx.json({ status: 'ERROR', message: 'Request is not valid' }, 400);
      }

      const resp = await sys.modules.resources.query.find(filter);

      ctx.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
      ctx.res.headers.set('Cache-Control', `public, max-age=${1 * 60 * 60}`);

      const isTracker = isTrackerEnabled(url.searchParams);

      return ctx.body(
        await getRssString({
          title: generateTitleFromFilter(filter),
          description: 'Anime Garden 是動漫花園資源網的第三方镜像站',
          site: `https://${sys.options.site ?? 'animes.garden'}/resources/1${url.search}`,
          trailingSlash: false,
          items: resp.resources.map((r) => {
            return {
              title: r.title,
              pubDate: toDate(r.createdAt, { timeZone: 'Asia/Shanghai' }),
              link: `https://${sys.options.site ?? 'animes.garden'}${getDetailURL(r)}`,
              enclosure: {
                url: r.magnet + (isTracker ? r.tracker : ''),
                length: r.size,
                type: 'application/x-bittorrent'
              }
            };
          })
        })
      );
    })
    .get('/collection/:hash/feed.xml', etag(), async (ctx) => {
      const url = new URL(ctx.req.url);

      const hsh = ctx.req.param('hash');
      if (!hsh) {
        return ctx.json({ status: 'ERROR', message: 'Missing collection hash' }, 400);
      }

      const resp = await sys.modules.collections.getCollection(hsh);
      if (!resp) {
        return ctx.json({ status: 'ERROR', message: `Collection "${hsh}" not found` }, 400);
      }

      ctx.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
      ctx.res.headers.set('Cache-Control', `public, max-age=${1 * 60 * 60}`);

      const isTracker = isTrackerEnabled(url.searchParams);

      return ctx.body(
        await getRssString({
          title: `${resp.name || '收藏夹 ' + hsh}`,
          description: 'Anime Garden 是動漫花園資源網的第三方镜像站.',
          site: `https://${sys.options.site ?? 'animes.garden'}/collection/${hsh}`,
          trailingSlash: false,
          items: resp.results
            .flatMap((r) => r.resources)
            .map((r) => {
              return {
                title: r.title,
                pubDate: toDate(r.createdAt, { timeZone: 'Asia/Shanghai' }),
                link: `https://${sys.options.site ?? 'animes.garden'}${getDetailURL(r)}`,
                enclosure: {
                  url: r.magnet + (isTracker ? r.tracker : ''),
                  length: r.size,
                  type: 'application/x-bittorrent'
                }
              };
            })
        })
      );
    })
);

function isTrackerEnabled(searchParams: URLSearchParams) {
  const value = searchParams.get('trakcer');
  return value === null ? true : ['no', 'off', 'false'].includes(value) ? false : true;
}

function getDetailURL(r: { provider: string; providerId: string }) {
  return `/detail/${r.provider}/${r.providerId}`;
}
