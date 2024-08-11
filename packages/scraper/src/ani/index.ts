import Parser from 'rss-parser';

import parseTorrent from 'parse-torrent';
import { JSDOM } from 'jsdom';
import { toMagnetURI } from 'parse-torrent';

import { type FetchedResource, ResourceDetail, retryFn, ANiTeam, ANiUser } from 'animegarden';

import { parseSize, splitOnce } from '../utils';

const parser = new Parser();

export interface FetchANiOptions {
  retry?: number;
}

export interface FetchANiDetailOptions {
  retry?: number;
}

export async function fetchLastestANi(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  options: FetchANiOptions = {}
) {
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
      throw new Error(resp.statusText, { cause: resp });
    }
    return resp;
  }, retry);
  if (!resp.ok) {
    throw new Error('Failed connecting https://api.ani.rip/');
  }

  const feed = await parser.parseString(await resp.text());

  const res: FetchedResource[] = [];
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
        throw new Error(resp.statusText, { cause: resp });
      }
      return resp;
    }, retry);
    if (!resp.ok) {
      throw new Error('Failed connecting https://api.ani.rip/');
    }

    const filename = link.split('/').at(-1)!;
    const providerId = filename.slice(0, filename.indexOf('.'));

    const blob = await resp.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    // parseTorrent return a promise
    const torrent = await parseTorrent(buffer);
    const [magnet, tracker] = splitOnce(toMagnetURI(torrent), '&');
    const size = parseSize(item.enclosure.length);

    res.push({
      provider: 'ani',
      providerId,
      title: item.title,
      href: link,
      type: '動畫',
      magnet,
      tracker,
      size,
      fansub: { id: '1', name: 'ANi' },
      publisher: { id: '1', name: 'ANi' },
      createdAt: item.pubDate
    });
  }

  return res;
}

export async function fetchANiDetail(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  id: string,
  options: FetchANiDetailOptions = {}
): Promise<ResourceDetail | undefined> {
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
      throw new Error(resp.statusText, { cause: resp });
    }
    return resp;
  }, retry);
  if (!resp.ok) {
    throw new Error('Failed connecting https://nyaa.si/');
  }

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
    magnet: {
      user: `https://nyaa.si/download/${id}.torrent`,
      href: fullMagnet,
      href2: magnet,
      ddplay: '',
      files,
      hasMoreFiles: false
    },
    type: '動畫',
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
    createdAt: createdAt.toISOString()
  };
}
