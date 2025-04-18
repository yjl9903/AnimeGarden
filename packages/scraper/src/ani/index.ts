import Parser from 'rss-parser';

import parseTorrent from 'parse-torrent';
import { JSDOM } from 'jsdom';
import { toMagnetURI } from 'parse-torrent';

import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { parse } from 'anipar';
import { retryFn } from '@animegarden/shared';

import { NetworkError } from '../error';
import { parseSize, removeExtraSpaces, replaceSuffix, splitOnce } from '../utils';

const parser = new Parser();

export interface FetchANiOptions {
  retry?: number;
}

export interface FetchANiDetailOptions {
  retry?: number;
}

const ANiUser = {
  name: 'ANi',
  provider: 'ani',
  providerId: '1',
  avatar: ''
} as const;

const ANiTeam = {
  name: 'ANi',
  provider: 'ani',
  providerId: '1',
  avatar: ''
} as const;

export async function fetchLastestANi(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  options: FetchANiOptions = {}
): Promise<ScrapedResource[]> {
  const { retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://api.ani.rip/ani-torrent.xml`, {
      headers: new Headers([
        [
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ]
      ])
    });
    if (!resp.ok) {
      throw new NetworkError('ani', 'https://api.ani.rip/', resp);
    }
    return resp;
  }, retry);

  const feed = await parser.parseString(await resp.text());

  const res: ScrapedResource[] = [];
  for (const item of feed.items) {
    if (!item.title || !item.pubDate || !item.enclosure?.length) continue;

    const link = item.link;
    if (!link || !link.endsWith('.torrent')) continue;

    const resp = await retryFn(async () => {
      const resp = await ofetch(link, {
        headers: new Headers([
          [
            'User-Agent',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
          ]
        ])
      });
      if (!resp.ok) {
        throw new NetworkError('ani', link, resp);
      }
      return resp;
    }, retry);

    const blob = await resp.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    // parseTorrent return a promise
    const torrent = await parseTorrent(buffer);
    const [magnet, tracker] = splitOnce(toMagnetURI(torrent), '&');
    const size = parseSize(item.enclosure.length);

    const filename = link.split('/').at(-1)!;
    const providerId = link.startsWith('https://tds.ani.rip/')
      ? magnet.slice('magnet:?xt=urn:btih:'.length)
      : filename.slice(0, filename.indexOf('.'));

    const rawTitle = replaceSuffix(removeExtraSpaces(item.title), {
      '.torrent': '[MP4]',
      '.mp4': '[MP4]',
      '.MP4': '[MP4]',
      '.mkv': '[MKV]',
      '.MKV': '[MKV]'
    });

    function transformAlias(title: string) {
      const info = parse(title, { fansub: 'ANi' });

      if (info && info.title) {
        if (info.titles?.length === 1) {
          {
            const exist = info.titles[0] + ' - ' + info.title;
            if (title.indexOf(exist) !== -1) {
              return title.replace(exist, info.titles[0] + ' / ' + info.title);
            }
          }

          if (info.season?.number) {
            const exist =
              info.titles[0] +
              ' ' +
              `S${String(info.season.number).padStart(2, '0')}` +
              ' - ' +
              info.title;
            if (title.indexOf(exist) !== -1) {
              return title.replace(
                exist,
                info.titles[0] +
                  ' ' +
                  `S${String(info.season.number).padStart(2, '0')}` +
                  ' / ' +
                  info.title
              );
            }
          }

          {
            const exist = info.title + ' - ' + info.titles[0];
            if (title.indexOf(exist) !== -1) {
              return title.replace(exist, info.title + ' / ' + info.titles[0]);
            }
          }
        } else {
          {
            const exist = info.title + ' - ' + info.title;
            if (title.indexOf(exist) !== -1) {
              return title.replace(exist, info.title + ' / ' + info.title);
            }
          }
        }
      }
      return title;
    }

    res.push({
      provider: 'ani',
      providerId,
      title: transformAlias(rawTitle),
      href: link,
      type: '动画',
      magnet,
      tracker,
      size,
      publisher: { id: ANiUser.providerId, name: ANiUser.name },
      fansub: { id: ANiTeam.providerId, name: ANiTeam.name },
      createdAt: item.pubDate
    });
  }

  return res;
}

export async function fetchANiDetail(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  id: string,
  options: FetchANiDetailOptions = {}
): Promise<ScrapedResourceDetail | undefined> {
  const { retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://nyaa.si/view/${id}`, {
      headers: new Headers([
        [
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ]
      ])
    });
    if (!resp.ok) {
      throw new NetworkError('ani', `https://nyaa.si/view/${id}`, resp);
    }
    return resp;
  }, retry);

  const html = await resp.text();
  const { document } = new JSDOM(html).window;

  const title = document.querySelector('.panel-heading .panel-title')?.textContent?.trim();
  if (!title) return undefined;

  const description = document.querySelector('#torrent-description')?.innerHTML?.trim() ?? '';
  const rawCreatedAt = document
    .querySelector('.panel-body .col-md-5:last-child')
    ?.getAttribute('data-timestamp');
  if (!rawCreatedAt) return undefined;
  const createdAt = new Date(+rawCreatedAt * 1000);

  const fullMagnet =
    document.querySelector('.panel-footer a.card-footer-item')?.getAttribute('href')?.trim() ?? '';
  if (!fullMagnet) return undefined;
  const [magnet] = splitOnce(fullMagnet, '&');

  const size =
    document.querySelector('.panel-body .row:nth-child(4) .col-md-5')?.textContent?.trim() ?? '';

  const files = Array.from(document.querySelectorAll('.torrent-file-list li')).map((file) => {
    const name = file.childNodes[1].textContent ?? '';
    const filesize = file.querySelector('.file-size')?.textContent?.trim() ?? '';
    const size = filesize ? filesize.slice(1, filesize.length - 1) : '';

    return {
      name,
      size
    };
  });

  return {
    provider: 'ani',
    providerId: id,
    title,
    href: `https://nyaa.si/view/${id}`,
    description,
    type: '动画',
    size,
    publisher: {
      id: ANiUser.providerId,
      name: ANiUser.name,
      avatar: ANiUser.avatar
    },
    fansub: {
      id: ANiTeam.providerId,
      name: ANiTeam.name,
      avatar: ANiTeam.avatar
    },
    createdAt: createdAt.toISOString(),
    magnets: [
      {
        name: '种子',
        url: `https://nyaa.si/download/${id}.torrent`
      },
      {
        name: '磁力链接',
        url: fullMagnet
      }
    ],
    files,
    hasMoreFiles: false
  };
}
