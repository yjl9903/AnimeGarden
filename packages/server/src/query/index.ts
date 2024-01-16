import type { Context } from 'hono';

import { parseSearchURL } from 'animegarden';

import { registerApp } from '../app';

import { queryResources } from './resources';
import { getDmhyResourceDetail } from './detail';

export function registerQuery() {
  registerApp((app) => {
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
      return ctx.json({ filter, ...resp });
    }

    app.get(`/resources`, async (ctx) => {
      return listResourcesHandler(ctx);
    });
    app.post(`/resources`, async (ctx) => {
      return listResourcesHandler(ctx);
    });
    app.get(`/detail/:href`, async (ctx) => {});
    app.get(`/resource/:href`, async (ctx) => {});

    app.get(`/dmhy/resources`, async (ctx) => {
      return listResourcesHandler(ctx, 'dmhy');
    });
    app.post(`/dmhy/resources`, async (ctx) => {
      return listResourcesHandler(ctx, 'dmhy');
    });
    app.get(`/dmhy/detail/:href`, async (ctx) => {
      return getDmhyResourceDetail(ctx);
    });
    app.get(`/dmhy/resource/:href`, async (ctx) => {
      return getDmhyResourceDetail(ctx);
    });

    app.get(`/moe/resources`, async (ctx) => {
      return listResourcesHandler(ctx, 'moe');
    });
    app.post(`/moe/resources`, async (ctx) => {
      return listResourcesHandler(ctx, 'moe');
    });
    app.get(`/moe/detail/:href`, async (ctx) => {});
    app.get(`/moe/resource/:href`, async (ctx) => {});
  });
}
