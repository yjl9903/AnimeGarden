import type { APIRoute } from 'astro';

import rss from '@astrojs/rss';
import { z } from 'zod';
import { toDate } from 'date-fns-tz';
import { getRuntime } from '@astrojs/cloudflare/runtime';
import { FilterSchema, fetchResources } from 'animegarden';

import { Env } from '../env';
import { wfetch } from '../fetch';
import { WORKER_BASE } from '../constant';

const ManyFilterSchema = z.union([z.array(FilterSchema), FilterSchema.transform((f) => [f])]);

export const get: APIRoute = async (context) => {
  try {
    const filterString = context.url.searchParams.get('filter');
    const rawFilter = filterString ? JSON.parse(filterString) : { page: 1, pageSize: 1000 };
    const filter = ManyFilterSchema.safeParse(rawFilter);

    if (filter.success && filter.data.length > 0) {
      const title = inferTitle(context.url);
      const runtime = getRuntime<Env>(context.request);
      const { resources } = await fetchResources(wfetch(runtime?.env?.worker), {
        ...filter.data[0],
        page: 1,
        pageSize: 1000,
        baseURL: 'https://' + WORKER_BASE
      });

      return rss({
        title,
        description:
          'Anime Garden 是動漫花園資源網的第三方镜像站, 動漫花園資訊網是一個動漫愛好者交流的平台,提供最及時,最全面的動畫,漫畫,動漫音樂,動漫下載,BT,ED,動漫遊戲,資訊,分享,交流,讨论.',
        site: context.site!.origin,
        items: resources.map((r) => {
          return {
            title: r.title,
            pubDate: toDate(r.createdAt, { timeZone: 'Asia/Shanghai' }),
            link: toGardenURL(context.site!.origin, r.href),
            enclosure: {
              url: r.magnet,
              length: r.size ? formatSize(r.size) : 1,
              type: 'application/x-bittorrent'
            }
          };
        })
      });
    }
  } catch (error) {
    console.error(error);
  }

  return new Response(JSON.stringify({ status: 400 }), { status: 400 });
};

function inferTitle(url: URL) {
  const search = get('search') ?? get('include') ?? undefined;
  return search ?? 'Anime Garden - 動漫花園資源網 第三方镜像站';

  function get(key: string) {
    const content = url.searchParams.get(key);
    try {
      const arr = JSON.parse(content ?? '[]') as (string | string[])[];
      if (Array.isArray(arr) && arr.length >= 1) {
        return arr
          .map((a) => {
            if (typeof a === 'string') {
              return a;
            } else if (Array.isArray(a) && a.length >= 1 && typeof a[0] === 'string') {
              return a[0];
            } else {
              return '';
            }
          })
          .join(' ');
      }
      return undefined;
    } catch {
      return undefined;
    }
  }
}

function toGardenURL(origin: string, href: string) {
  const id = href.split('/').at(-1)!;
  return origin + '/resource/' + id;
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
