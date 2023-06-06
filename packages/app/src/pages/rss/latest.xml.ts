import type { APIRoute } from 'astro';

import rss from '@astrojs/rss';
import { toDate } from 'date-fns-tz';

import { fetchResources } from '../../fetch';

export const get: APIRoute = async (context) => {
  const { resources } = await fetchResources(1);

  return rss({
    title: 'Anime Garden 最新资源',
    description: 'Anime Garden 最新资源',
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
};

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
