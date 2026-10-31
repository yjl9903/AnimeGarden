import type { Context } from 'hono';

import { type ProviderType, SupportProviders } from '@animegarden/client';

import type { System } from '../../system/index.ts';

import { memo } from '../../utils/index.ts';
import { type Provider, ScraperProviders } from '../../providers/index.ts';

import { defineHandler } from '../utils/hono.ts';
import { MAX_DETAIL_CACHE_COUNT } from '../constants.ts';
import { safeEtag as etag } from '../utils/etag.ts';
import { parseResourcesQuery } from '../utils/resources-query.ts';

export const defineResourcesRoutes = defineHandler((sys, app) => {
  async function listResources(ctx: Context, sys: System, provider?: ProviderType) {
    const url = new URL(ctx.req.url);
    // sys.logger.info(`Receive search params: ${url.search}`);

    const body = (await ctx.req.json().catch(() => undefined)) as
      Record<string, unknown> | undefined;
    const latest = new Date(sys.modules.providers.timestamp);
    const { pagination, filter } = parseResourcesQuery(url.searchParams, body);

    if (provider) {
      filter.provider = provider;
    }

    ctx.set('responseTimestamp', latest);

    const resp = await sys.modules.resources.query.find(filter, pagination);

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

    ctx.res.headers.set(
      'Cache-Control',
      pagination.cursor?.position
        ? 'public, max-age=1800, stale-while-revalidate=86400'
        : pagination.cursor
          ? 'public, max-age=600, stale-while-revalidate=3600'
          : 'public, max-age=60, stale-while-revalidate=300'
    );

    return ctx.json({
      status: 'OK',
      ...resp
    });
  }

  const findProviderDetail = memo(
    async (sys: System, provider: Provider, path: string) => {
      const detailURL = await provider.getDetailURL(sys, path);
      if (!detailURL) {
        return {
          status: 'ERROR' as const,
          message: `Unknown detail id: ${provider.name} ${path}`
        };
      }

      const { providerId, href } = detailURL;
      const resp = await sys.modules.resources.details.getByProviderId(
        provider.name,
        providerId,
        () => provider.fetchResourceDetail(sys, href)
      );

      if (!resp.resource) {
        return {
          status: 'ERROR' as const,
          message: `Unknown detail id: ${provider.name} ${path}`
        };
      }

      return {
        status: 'OK' as const,
        ...resp
      };
    },
    {
      getKey: (_sys, provider, path) => provider + ':' + path,
      expirationTtl: 60 * 60 * 1000,
      maxSize: MAX_DETAIL_CACHE_COUNT,
      autoStartGC: true,
      cacheErrors: false
    }
  );

  app
    .all('/resources', etag(), (c) => {
      return listResources(c, sys);
    })
    .all('/resources/', etag(), (c) => {
      return listResources(c, sys);
    });

  for (const provider of SupportProviders) {
    app
      .all(`/resources/${provider}`, etag(), (c) => {
        return listResources(c, sys, provider);
      })
      .all(`/resources/${provider}/`, etag(), (c) => {
        return listResources(c, sys, provider);
      })
      .get(`/resource/${provider}/:id`, etag(), async (c) => {
        const resp = await findProviderDetail(
          sys,
          ScraperProviders.get(provider)!,
          c.req.param('id')
        );
        if (resp.status === 'ERROR') {
          c.res.headers.set('Cache-Control', 'no-store');
          return c.json({ ...resp }, 404);
        }
        c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
        return c.json({ ...resp });
      })
      .get(`/detail/${provider}/:id`, etag(), async (c) => {
        const resp = await findProviderDetail(
          sys,
          ScraperProviders.get(provider)!,
          c.req.param('id')
        );

        if (resp.status === 'ERROR') {
          c.res.headers.set('Cache-Control', 'no-store');
          return c.json({ ...resp }, 404);
        }

        c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
        return c.json({ ...resp });
      });
  }

  app.get('/detail/infohash/:hash', etag(), async (c) => {
    const raw = c.req.param('hash') ?? '';
    const infoHash = raw.trim();
    const upper = infoHash.toUpperCase();
    const isHex = /^[0-9A-F]{40}$/.test(upper);
    const isBase32 = /^[A-Z2-7]{32}$/.test(upper);

    if (!infoHash || (!isHex && !isBase32)) {
      c.res.headers.set('Cache-Control', 'no-store');

      return c.json(
        {
          status: 'ERROR',
          message: `Invalid info hash: ${infoHash || raw}`,
          resource: undefined,
          detail: undefined,
          isDeleted: false,
          duplicatedId: undefined
        },
        400
      );
    }

    const resp = await sys.modules.resources.details.getByInfoHash(infoHash);

    if (!resp.resource) {
      c.res.headers.set('Cache-Control', 'no-store');

      return c.json(
        {
          status: 'ERROR',
          message: `Unknown detail info hash: ${infoHash}`,
          ...resp
        },
        404
      );
    }

    c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
    return c.json({
      status: 'OK',
      ...resp
    });
  });

  return app;
});
