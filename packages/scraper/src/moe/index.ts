import type { FetchedResource, ResourceDetail } from 'animegarden';

import { retryFn } from 'animegarden';

export interface FetchMoePageOptions {
  page?: number;

  retry?: number;
}

export interface FetchMoeDetailOptions {
  retry?: number;
}

const TRACKER = `&tr=https%3A%2F%2Ftr.bangumi.moe%3A9696%2Fannounce&tr=http%3A%2F%2Ftr.bangumi.moe%3A6969%2Fannounce&tr=udp%3A%2F%2Ftr.bangumi.moe%3A6969%2Fannounce&tr=http%3A%2F%2Fopen.acgtracker.com%3A1096%2Fannounce&tr=http%3A%2F%2F208.67.16.113%3A8000%2Fannounce&tr=udp%3A%2F%2F208.67.16.113%3A8000%2Fannounce&tr=http%3A%2F%2Ftracker.ktxp.com%3A6868%2Fannounce&tr=http%3A%2F%2Ftracker.ktxp.com%3A7070%2Fannounce&tr=http%3A%2F%2Ft2.popgo.org%3A7456%2Fannonce&tr=http%3A%2F%2Fbt.sc-ol.com%3A2710%2Fannounce&tr=http%3A%2F%2Fshare.camoe.cn%3A8080%2Fannounce&tr=http%3A%2F%2F61.154.116.205%3A8000%2Fannounce&tr=http%3A%2F%2Fbt.rghost.net%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.prq.to%2Fannounce&tr=http%3A%2F%2Fopen.nyaatorrents.info%3A6544%2Fannounce`;

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
      magnet: torrent.magnet,
      tracker: TRACKER,
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
