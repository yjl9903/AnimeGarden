import { parseURLSearch } from '@animegarden/client';

import { defineHandler } from '../utils/hono.ts';
import { safeEtag as etag } from '../utils/etag.ts';
import { assertResourcesPagination } from '../utils/resources-query.ts';

export const defineFeedRoutes = defineHandler((sys, app) =>
  app
    .get('/feed.xml', async (ctx) => {
      const params = normalizeSearchParams(new URL(ctx.req.url).searchParams);
      const { filter, pagination } = parseURLSearch(
        params,
        await ctx.req.json().catch(() => undefined)
      );
      assertResourcesPagination(pagination);

      const feed = await sys.modules.feed.getResourcesFeed({
        filter,
        pagination,
        tracker: isTrackerEnabled(params)
      });

      ctx.header(
        'Cache-Control',
        feed.stable ? 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60' : 'no-store'
      );

      if (feed.stable) {
        const tag = `"${feed.digest}"`;
        const lastModifiedAt = Math.floor(feed.generatedAt / 1000) * 1000;

        ctx.header('ETag', tag);
        ctx.header('Last-Modified', new Date(lastModifiedAt).toUTCString());

        const ifNoneMatch = ctx.req.header('If-None-Match');
        const modifiedSince = Date.parse(ctx.req.header('If-Modified-Since') ?? '');
        // HTTP dates cannot distinguish revisions generated within the same second.
        const dateValidatorSafe =
          feed.changedAt !== undefined && feed.changedAt < lastModifiedAt;
        // If-None-Match takes precedence, even when none of its tags match.
        const unchanged =
          ifNoneMatch !== undefined
            ? ifNoneMatch.trim() === '*' ||
              (ifNoneMatch.match(/(?:W\/)?"[^"]*"/g) ?? []).some(
                (value) => value.replace(/^W\//, '') === tag
              )
            : dateValidatorSafe && modifiedSince >= lastModifiedAt && modifiedSince <= Date.now();

        if (unchanged) {
          return ctx.body(null, 304);
        }
      }

      ctx.header('Content-Type', 'application/xml; charset=UTF-8');
      return ctx.body(feed.xml);
    })
    .get('/collection/:hash/feed.xml', etag(), async (ctx) => {
      const hash = ctx.req.param('hash');
      if (!hash) {
        return ctx.json({ status: 'ERROR', message: 'Missing collection hash' }, 400);
      }

      const params = normalizeSearchParams(new URL(ctx.req.url).searchParams);
      const xml = await sys.modules.feed.getCollectionFeed(hash, isTrackerEnabled(params));
      if (xml === undefined) {
        return ctx.json({ status: 'ERROR', message: `Collection "${hash}" not found` }, 400);
      }

      ctx.res.headers.set('Content-Type', 'application/xml; charset=UTF-8');
      ctx.res.headers.set('Cache-Control', 'public, max-age=3600');

      return ctx.body(xml);
    })
);

/** Normalize HTTP query spelling before the client parser interprets values. */
function normalizeSearchParams(search: URLSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of search) {
    const name = key.toLowerCase() === 'pagesize' ? 'pageSize' : key.toLowerCase();
    params.append(name, name === 'duplicate' ? value.toLowerCase() : value);
  }
  return params;
}

/** Parse the optional HTTP tracker switch, which defaults to enabled. */
function isTrackerEnabled(params: URLSearchParams) {
  const value = params.get('tracker');
  return value === null || !['false', 'off', 'no', '0'].includes(value.toLowerCase());
}
