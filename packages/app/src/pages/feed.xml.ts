import type { APIRoute } from 'astro';

import rss from '@astrojs/rss';
import { toDate } from 'date-fns-tz';
import { fetchResources } from 'animegarden';

import { ofetch } from '../fetch';
import { WORKER_BASE } from '../constant';

export const get: APIRoute = async (context) => {
  const url = new URL(context.request.url);
  url.protocol = 'https:';
  url.host = WORKER_BASE;
  url.port = '';
  url.pathname = '/resources/search';
  const request = new Request(url, context.request);

  const { resources } = await (ofetch(request).then((r) => r.json()) as ReturnType<
    typeof fetchResources
  >);

  return rss({
    title: 'Anime Garden - 動漫花園資源網 第三方镜像站',
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
