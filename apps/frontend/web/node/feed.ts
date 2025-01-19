import type { Handler } from 'hono';

import { z } from 'zod';
import { toDate } from 'date-fns-tz';
import {
  type Resource,
  type ResolvedFilterOptions,
  FilterSchema,
  fetchResources,
  stringifySearchURL
} from '@animegarden/client';

import { removeQuote } from '../app/utils/string';

import type { Bindings } from './types';

import rss from './rss';

const ManyFilterSchema = z.union([z.array(FilterSchema), FilterSchema.transform((f) => [f])]);

const TITLE = `Anime Garden - 動漫花園資源網 第三方镜像站`;

const DESCRIPTION = `Anime Garden 是動漫花園資源網的第三方镜像站, 動漫花園資訊網是一個動漫愛好者交流的平台,提供最及時,最全面的動畫,漫畫,動漫音樂,動漫下載,BT,ED,動漫遊戲,資訊,分享,交流,讨论.`;

export const feed = <E extends { Bindings: Bindings } = { Bindings: Bindings }>(): Handler<E> => {
  return async (ctx) => {
    try {
      const url = new URL(ctx.req.url);
      const getFilter = () => {
        const filterString = decodeURIComponent(url.searchParams.get('filter') ?? '');
        try {
          const rawFilter = filterString ? JSON.parse(filterString) : { page: 1, pageSize: 1000 };
          return { ok: true, filter: rawFilter } as const;
        } catch (error) {
          console.error('Parse filter JSON', ctx.req.url, filterString);
          console.error(error);
          return { ok: false, input: filterString, error: (error as any)?.message } as const;
        }
      };

      // Handle JSON parse error
      const rawFilter = getFilter();
      if (!rawFilter.ok) {
        return new Response(
          JSON.stringify({
            status: 400,
            detail: {
              url: ctx.req.url,
              filter: rawFilter.input,
              message: rawFilter.error
            }
          }),
          { status: 400 }
        );
      }

      const filter = ManyFilterSchema.safeParse(rawFilter.filter);
      const origin = url.origin;

      if (filter.success && filter.data.length > 0) {
        const title = inferTitle(url.searchParams, filter.data[0] as ResolvedFilterOptions);

        // API Server url
        const { SERVER_HOST, SERVER_PROTOCOL, SERVER_PORT, SERVER_BASE } = ctx.env;
        const baseURL = ctx.env.SERVER_HOST
          ? `${SERVER_PROTOCOL || 'http'}://${SERVER_HOST}${SERVER_PORT ? ':' + SERVER_PORT : ''}${SERVER_BASE}`
          : `https://${url.host}/api/`;

        const resp = await Promise.all(
          filter.data.map((f) =>
            fetchResources(fetch, {
              ...f,
              tracker: true,
              baseURL,
              page: 1,
              pageSize: 100
            })
          )
        );
        const resources = resp.flatMap((r) => r.resources);

        const feed = await rss({
          title,
          description: DESCRIPTION,
          site: stringifySearchURL(origin, filter.data[0]).toString(),
          trailingSlash: false,
          items: resources.map((r) => {
            return {
              title: r.title,
              pubDate: toDate(r.createdAt, { timeZone: 'Asia/Shanghai' }),
              link: toGardenURL(origin, r),
              enclosure: {
                url: r.magnet,
                length: r.size ? formatSize(r.size) : 1,
                type: 'application/x-bittorrent'
              }
            };
          })
        });
        // Cache 300 seconds
        feed.headers.set('cache-control', `public, max-age=300`);

        return feed;
      } else if (filter.success && filter.data.length === 0) {
        // Empty response
        const empty = await rss({
          title: TITLE,
          description: DESCRIPTION,
          site: origin,
          trailingSlash: false,
          items: []
        });

        return empty;
      } else {
        // Error
        return new Response(
          JSON.stringify({
            status: 400,
            detail: {
              url: ctx.req.url,
              filter: rawFilter.input,
              message: filter.success === false ? filter.error.message : 'unknown'
            }
          }),
          { status: 400 }
        );
      }
    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          status: 400,
          detail: {
            url: ctx.req.url,
            message: (error as any)?.message
          }
        }),
        { status: 400 }
      );
    }
  };
};

function inferTitle(params: URLSearchParams, options: ResolvedFilterOptions) {
  if (params.get('title')) {
    return params.get('title')!;
  }
  if (options.search && options.search.length > 0) {
    return removeQuote(options.search).join(' ');
  }
  if (options.include && options.include.length > 0) {
    return options.include[0];
  }
  return TITLE;
}

function toGardenURL(origin: string, r: Resource) {
  return origin + `/detail/${r.provider}/${r.providerId}`;
}

function formatSize(size: string) {
  const RES = [
    [/^([0-9\.]+)B$/, 1],
    [/^([0-9\.]+)KB$/, 1024],
    [/^([0-9\.]+)MB$/, 1024 * 1024],
    [/^([0-9\.]+)GB$/, 1024 * 1024 * 1024],
    [/^([0-9\.]+)TB$/, 1024 * 1024 * 1024 * 1024]
  ] as const;
  for (const [RE, base] of RES) {
    const match = RE.exec(size);
    if (match) {
      return Math.round(+match[1] * base);
    }
  }
  return 0;
}
