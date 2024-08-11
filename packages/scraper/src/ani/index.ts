import Parser from 'rss-parser';

import parseTorrent from 'parse-torrent';
import { toMagnetURI } from 'parse-torrent';

import { type FetchedResource, retryFn } from 'animegarden';

import { parseSize, splitOnce } from '../utils';

const parser = new Parser();

export interface FetchANiOptions {
  retry?: number;
}

export async function fetchLastestANi(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  options: FetchANiOptions = {}
) {
  const { retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://api.ani.rip/ani-torrent.xml`);
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
