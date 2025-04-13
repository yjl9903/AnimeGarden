import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { retryFn } from '@animegarden/shared';

import { NetworkError } from '../error';
import { removeExtraSpaces, stripSuffix } from '../utils';

import { getType } from './tag';
import { fetchTeam, fetchUser } from './user';

export interface FetchMoePageOptions {
  page?: number;

  retry?: number;
}

export interface FetchMoeDetailOptions {
  retry?: number;
}

const TRACKER = `&tr=https%3A%2F%2Ftr.bangumi.moe%3A9696%2Fannounce&tr=http%3A%2F%2Ftr.bangumi.moe%3A6969%2Fannounce&tr=udp%3A%2F%2Ftr.bangumi.moe%3A6969%2Fannounce&tr=http%3A%2F%2Fopen.acgtracker.com%3A1096%2Fannounce&tr=http%3A%2F%2F208.67.16.113%3A8000%2Fannounce&tr=udp%3A%2F%2F208.67.16.113%3A8000%2Fannounce&tr=http%3A%2F%2Ftracker.ktxp.com%3A6868%2Fannounce&tr=http%3A%2F%2Ftracker.ktxp.com%3A7070%2Fannounce&tr=http%3A%2F%2Ft2.popgo.org%3A7456%2Fannonce&tr=http%3A%2F%2Fbt.sc-ol.com%3A2710%2Fannounce&tr=http%3A%2F%2Fshare.camoe.cn%3A8080%2Fannounce&tr=http%3A%2F%2F61.154.116.205%3A8000%2Fannounce&tr=http%3A%2F%2Fbt.rghost.net%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.publicbt.com%3A80%2Fannounce&tr=http%3A%2F%2Ftracker.prq.to%2Fannounce&tr=http%3A%2F%2Fopen.nyaatorrents.info%3A6544%2Fannounce`;

export async function fetchMoePage(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  options: FetchMoePageOptions = {}
): Promise<ScrapedResource[]> {
  const { page = 1, retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://bangumi.moe/api/torrent/page/${page}`, {
      headers: new Headers([
        [
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ]
      ])
    });
    if (!resp.ok) {
      throw new NetworkError('moe', `https://bangumi.moe/api/torrent/page/${page}`, resp);
    }
    return resp;
  }, retry);

  const data = await resp.json();

  const result: ScrapedResource[] = [];
  for (const torrent of data?.torrents ?? []) {
    const user = await fetchUser(ofetch, torrent.uploader_id);
    const team = torrent.team_id ? await fetchTeam(ofetch, torrent.team_id) : undefined;

    let title = torrent.title;

    // @hack
    if (team?.name === 'ANi' || team?.name === '云光字幕组') {
      // @hack
      title = stripSuffix(removeExtraSpaces(title), [
        '.torrent',
        '.mp3',
        '.MP3',
        '.mp4',
        '.MP4',
        '.mkv',
        '.MKV'
      ]);
    } else {
      title = removeExtraSpaces(title);
    }

    result.push({
      provider: 'moe',
      providerId: torrent._id,
      title,
      href: torrent._id,
      magnet: torrent.magnet,
      tracker: TRACKER,
      type: getType(torrent.tag_ids),
      size: torrent.size,
      publisher: {
        id: torrent.uploader_id,
        name: user.name,
        avatar: team?.avatar
      },
      fansub: team
        ? {
            id: torrent.team_id,
            name: team.name,
            avatar: team.avatar
          }
        : undefined,
      createdAt: torrent.publish_time
    });
  }

  return result;
}

export async function fetchMoeDetail(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  id: string,
  options: FetchMoeDetailOptions = {}
): Promise<ScrapedResourceDetail> {
  const { retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://bangumi.moe/api/torrent/fetch`, {
      method: 'POST',
      body: JSON.stringify({ _id: id })
    });
    if (!resp.ok) {
      throw new NetworkError('moe', `https://bangumi.moe/api/torrent/fetch`, resp);
    }
    return resp;
  }, retry);

  const torrent = await resp.json();

  const user = await fetchUser(ofetch, torrent.uploader_id);
  const team = await fetchTeam(ofetch, torrent.team_id);

  return {
    provider: 'moe',
    providerId: torrent._id,
    title: torrent.title,
    href: `https://bangumi.moe/torrent/${torrent._id}`,
    description: torrent.introduction,
    type: getType(torrent.tag_ids),
    size: torrent.size,
    publisher: {
      id: torrent.uploader_id,
      name: user.name,
      avatar: team.avatar
    },
    fansub: {
      id: torrent.team_id,
      name: team.name,
      avatar: team.avatar
    },
    magnets: [
      {
        name: '磁力链接',
        url: torrent.magnet
      }
    ],
    createdAt: torrent.publish_time,
    files: torrent.content.map((t: [string, string]) => ({ name: t[0], size: t[1] })),
    hasMoreFiles: false
  };
}
