import type { Context } from 'hono';

import { parseSearchURL } from 'animegarden';

import { registerApp } from '../app';

import { queryResources } from './resources';
import { getMoeResourceDetail } from './moe';
import { getDmhyResourceDetail } from './dmhy';
import { getANiResourceDetail } from './ani';

export function registerQuery() {
  return registerApp((app) => {
    async function listResourcesHandler(ctx: Context, provider?: string) {
      const url = new URL(ctx.req.url);
      const filter = parseSearchURL(url.searchParams, await ctx.req.json().catch(() => undefined));
      if (!filter) {
        return ctx.json({ message: 'Request is not valid' }, 400);
      }
      if (provider) {
        filter.provider = [provider];
      }
      const resp = await queryResources(ctx, filter);

      // Remove tracker the response body
      const isEnable = (key: string) => {
        const value = ctx.req.query(key);
        return value !== undefined && ['true', 'yes', 'on'].includes(value.toLowerCase());
      };
      const enableTracker = isEnable('tracker');
      if (!enableTracker) {
        for (const r of resp.resources) {
          r.tracker = null;
        }
      }

      return ctx.json({ filter, ...resp });
    }

    return app
      .get(`/resources`, async (ctx) => {
        return listResourcesHandler(ctx);
      })
      .post(`/resources`, async (ctx) => {
        return listResourcesHandler(ctx);
      })
      .get(`/resources/`, async (ctx) => {
        return listResourcesHandler(ctx);
      })
      .post(`/resources/`, async (ctx) => {
        return listResourcesHandler(ctx);
      })
      .all(`/resources/dmhy`, async (ctx) => {
        return listResourcesHandler(ctx, 'dmhy');
      })
      .all(`/dmhy/resources`, async (ctx) => {
        return listResourcesHandler(ctx, 'dmhy');
      })
      .get(`/dmhy/detail/:href`, async (ctx) => {
        return getDmhyResourceDetail(ctx);
      })
      .get(`/dmhy/resource/:href`, async (ctx) => {
        return getDmhyResourceDetail(ctx);
      })
      .get(`/detail/dmhy/:href`, async (ctx) => {
        return getDmhyResourceDetail(ctx);
      })
      .get(`/resource/dmhy/:href`, async (ctx) => {
        return getDmhyResourceDetail(ctx);
      })
      .all(`/resources/moe`, async (ctx) => {
        return listResourcesHandler(ctx, 'moe');
      })
      .all(`/moe/resources`, async (ctx) => {
        return listResourcesHandler(ctx, 'moe');
      })
      .get(`/moe/detail/:href`, async (ctx) => {
        return getMoeResourceDetail(ctx);
      })
      .get(`/moe/resource/:href`, async (ctx) => {
        return getMoeResourceDetail(ctx);
      })
      .get(`/detail/moe/:href`, async (ctx) => {
        return getMoeResourceDetail(ctx);
      })
      .get(`/resource/moe/:href`, async (ctx) => {
        return getMoeResourceDetail(ctx);
      })
      .all(`/resources/ani`, async (ctx) => {
        return listResourcesHandler(ctx, 'ani');
      })
      .all(`/ani/resources`, async (ctx) => {
        return listResourcesHandler(ctx, 'ani');
      })
      .get(`/ani/detail/:href`, async (ctx) => {
        return getANiResourceDetail(ctx);
      })
      .get(`/ani/resource/:href`, async (ctx) => {
        return getANiResourceDetail(ctx);
      })
      .get(`/detail/ani/:href`, async (ctx) => {
        return getANiResourceDetail(ctx);
      })
      .get(`/resource/ani/:href`, async (ctx) => {
        return getANiResourceDetail(ctx);
      });
  });
}
