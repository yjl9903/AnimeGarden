import type { FetchedResource, ResourceDetail, ResourceType } from 'animegarden';

import { retryFn } from 'animegarden';

export interface FetchMoePageOptions {
  page?: number;

  retry?: number;
}

export interface FetchMoeDetailOptions {
  retry?: number;
}

export async function fetchMoePage(
  ofetch: (request: string) => Promise<Response>,
  options: FetchMoePageOptions = {}
): Promise<FetchedResource[]> {
  const { page = 1, retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://bangumi.moe/api/torrent/page/${page}`);
    if (!resp.ok) {
      throw new Error(resp.statusText, { cause: resp });
    }
    return resp;
  }, retry);
  if (!resp.ok) {
    throw new Error('Failed connecting https://bangumi.moe/');
  }
  const data = await resp.json();

  // TODO
  const result: FetchedResource[] = [];
  for (const torrent of data?.torrents ?? []) {
    result.push({
      provider: 'moe',
      providerId: torrent._id,
      title: torrent.title,
      href: `https://bangumi.moe/torrent/${torrent._id}`,
      magnet: '',
      magnet2: null,
      magnetUser: null,
      type: '動畫',
      size: torrent.size,
      fansub: undefined,
      publisher: {
        id: '',
        name: ''
      },
      createdAt: torrent.publish_time
    });
  }

  return [];
}

export async function fetchMoeDetail(
  ofetch: (request: string) => Promise<Response>,
  href: string,
  options: FetchMoeDetailOptions = {}
): Promise<ResourceDetail | undefined> {
  return undefined;
}
