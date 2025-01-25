import { Context } from 'hono';

import type { System } from '@animegarden/database';
import { type ProviderType, parseURLSearch } from '@animegarden/client';

import { defineHandler } from '../utils/hono';

export const defineResourcesRoutes = defineHandler((sys, app) =>
  app
    .all('/resources', (c) => {
      return listResources(c, sys);
    })
    .all('/resources/', (c) => {
      return listResources(c, sys);
    })
    .all('/resources/dmhy', (c) => {
      return listResources(c, sys, 'dmhy');
    })
    .all('/resources/moe', (c) => {
      return listResources(c, sys, 'moe');
    })
    .all('/resources/ani', (c) => {
      return listResources(c, sys, 'ani');
    })
    .get('/detail/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/dmhy/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/moe/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/ani/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
);

async function listResources(ctx: Context, sys: System, provider?: ProviderType) {
  const url = new URL(ctx.req.url);
  const filter = parseURLSearch(url.searchParams, await ctx.req.json().catch(() => undefined));
  if (!filter) {
    return ctx.json({ status: 'ERROR', message: 'Request is not valid' }, 400);
  }

  if (provider) {
    filter.providers = [provider];
  }

  const resp = await sys.modules.resources.query.find(filter);

  // Remove tracker the response body
  const isEnable = (key: string) => {
    const value = ctx.req.query(key);
    return value !== undefined && ['true', 'yes', 'on'].includes(value.toLowerCase());
  };

  const enableTracker = isEnable('tracker');
  const enableMetadata = isEnable('metadata');
  if (!enableTracker || !enableMetadata) {
    for (const r of resp.resources) {
      if (!enableTracker) {
        // @ts-ignore
        delete r.tracker;
      }
      if (!enableMetadata) {
        // @ts-ignore
        delete r.metadata;
      }
    }
  }

  return ctx.json({ status: 'OK', ...resp, timestamp: sys.modules.providers.timestamp });
}
