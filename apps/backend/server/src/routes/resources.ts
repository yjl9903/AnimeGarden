import type { Context } from 'hono';

import { memoAsync } from 'memofunc';

import type { System } from '@animegarden/database';
import { type ProviderType, SupportProviders, parseURLSearch } from '@animegarden/client';

import { defineHandler } from '../utils/hono';
import { type Provider, ScraperProviders } from '../providers';

async function listResources(ctx: Context, sys: System, provider?: ProviderType) {
  const url = new URL(ctx.req.url);
  sys.logger.info(`Receive search params: ${url.search}`);

  const filter = parseURLSearch(url.searchParams, await ctx.req.json().catch(() => undefined));
  if (!filter) {
    return ctx.json({ status: 'ERROR', message: 'Request is not valid' }, 400);
  }

  if (provider) {
    filter.provider = provider;
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

const findProviderDetail = memoAsync(
  async (ctx: Context, sys: System, provider: Provider, path: string) => {
    const detailURL = await provider.getDetailURL(sys, path);
    if (!detailURL) {
      return ctx.json({
        status: 'ERROR',
        message: `Unknown detail id: ${provider.name} ${path}`
      });
    }

    const { providerId, href } = detailURL;
    const resp = await sys.modules.resources.details.getByProviderId(
      provider.name,
      providerId,
      () => provider.fetchResourceDetail(sys, href)
    );

    return ctx.json({
      status: 'OK',
      ...resp
    });
  },
  { expirationTtl: 60 * 60 * 1000, serialize: (_ctx, _sys, provider, path) => [provider, path] }
);

export const defineResourcesRoutes = defineHandler((sys, app) => {
  app
    .all('/resources', (c) => {
      return listResources(c, sys);
    })
    .all('/resources/', (c) => {
      return listResources(c, sys);
    });

  for (const provider of SupportProviders) {
    app
      .all(`/resources/${provider}`, (c) => {
        return listResources(c, sys, provider);
      })
      .all(`/resources/${provider}/`, (c) => {
        return listResources(c, sys, provider);
      })
      .get(`/resource/${provider}/:id`, (c) => {
        return findProviderDetail(c, sys, ScraperProviders.get(provider)!, c.req.param('id'));
      })
      .get(`/detail/${provider}/:id`, (c) => {
        return findProviderDetail(c, sys, ScraperProviders.get(provider)!, c.req.param('id'));
      });
  }

  return app;
});
