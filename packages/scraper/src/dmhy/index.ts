import { JSDOM } from 'jsdom';

import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { retryFn } from '@animegarden/client';

import { NetworkError } from '../error';
import { splitOnce, toShanghai } from '../utils';

export interface FetchDmhyPageOptions {
  page?: number;

  retry?: number;
}

export interface FetchDmhyDetailOptions {
  retry?: number;
}

export async function fetchDmhyPage(
  ofetch: (request: string) => Promise<Response>,
  options: FetchDmhyPageOptions = {}
): Promise<ScrapedResource[]> {
  const { page = 1, retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://share.dmhy.org/topics/list/page/${page}`);
    if (!resp.ok) {
      throw new NetworkError('dmhy', `https://share.dmhy.org/topics/list/page/${page}`, resp);
    }
    return resp;
  }, retry);

  const html = await resp.text();
  const { document } = new JSDOM(html).window;

  if (document.querySelector('.ui-state-error')) {
    throw new NetworkError('dmhy', `https://share.dmhy.org/topics/list/page/${page}`, resp);
  }

  const res: ScrapedResource[] = [];
  for (const row of document.querySelectorAll('#topic_list tbody tr')) {
    const tds = [...row.querySelectorAll('td')];

    const rawCreatedAt = tds[0].querySelector('span')?.textContent?.trim();
    if (!rawCreatedAt) {
      continue;
    }
    const createdAt = toShanghai(new Date(rawCreatedAt)).toISOString();

    const rawType = (tds[1].textContent ?? '').trim();
    const type = SimpleType[rawType in DisplayType ? DisplayType[rawType] : rawType] ?? '动画';

    const titleNode = [...tds[2].children].find((n) => n.tagName === 'A');
    if (!titleNode) {
      continue;
    }
    const title = titleNode.textContent?.trim() ?? '';
    const href = 'https://share.dmhy.org' + (titleNode.getAttribute('href') ?? '/').trim();

    const fansub: HTMLAnchorElement | null = tds[2].querySelector('span.tag a');
    const fansubName = fansub?.textContent?.trim();
    const fansubId = fansub?.getAttribute('href')?.split('/').at(-1);

    const magnetFull = tds[3].querySelector('a')?.getAttribute('href');
    if (!magnetFull) {
      continue;
    }
    const [magnet, tracker] = splitOnce(magnetFull, '&');

    const size = tds[4].textContent?.trim() || '';

    const publisher = tds[8].querySelector('a');
    const publisherName = publisher?.textContent;
    const publisherId = publisher?.getAttribute('href')!.split('/').at(-1);

    const lastHref = href.split('/').at(-1);
    if (!lastHref) continue;
    const matchId = /^(\d+)/.exec(lastHref);
    if (!matchId) continue;

    res.push({
      provider: 'dmhy',
      providerId: matchId[1],
      title,
      href,
      type,
      magnet,
      tracker,
      size,
      fansub: fansubId && fansubName ? { id: fansubId, name: fansubName } : undefined,
      publisher:
        publisherId && publisherName ? { id: publisherId, name: publisherName } : undefined,
      createdAt
    });
  }

  return res;
}

export async function fetchDmhyDetail(
  ofetch: (request: string) => Promise<Response>,
  href: string,
  options: FetchDmhyDetailOptions = {}
): Promise<ScrapedResourceDetail | undefined> {
  const url = new URL(href, `https://share.dmhy.org/topics/view/`);
  const lastHref = url.href.split('/').at(-1);
  if (!lastHref) return undefined;
  const matchId = /^(\d+)/.exec(lastHref);
  if (!matchId) return undefined;

  const { retry = 5 } = options;
  const resp = await retryFn(async () => {
    const resp = await ofetch(url.href);
    if (!resp.ok) {
      throw new NetworkError('dmhy', url.href, resp);
    }
    return resp;
  }, retry);

  const html = await resp.text();
  const { document } = new JSDOM(html).window;

  if (document.querySelector('.ui-state-error')) {
    throw new NetworkError('dmhy', url.href, resp);
  }

  const title = document.querySelector('.topic-main>.topic-title>h3')?.textContent?.trim();

  // Resource may be deleted
  if (!title) {
    return undefined;
  }

  const rawType =
    document
      .querySelector('.topic-main>.topic-title li:first-child a:last-of-type')
      ?.textContent?.trim() ?? '';
  const type = SimpleType[rawType in DisplayType ? DisplayType[rawType] : rawType] ?? '动画';

  const size =
    document.querySelector('.topic-main>.topic-title li:nth-child(5) span')?.textContent?.trim() ??
    '';

  const rawCreatedAt = document
    .querySelector('.topic-main>.topic-title li:nth-child(2) span')
    ?.textContent?.trim();
  if (!rawCreatedAt) return undefined;
  const createdAt = toShanghai(new Date(rawCreatedAt)).toISOString();

  const publisherAvatar =
    document.querySelector('.topics_bk .avatar:first-child img')?.getAttribute('src')?.trim() ??
    'https://share.dmhy.org/images/defaultUser.png';
  const publisherName = document
    .querySelector('.topics_bk .avatar:first-child p:nth-child(2) a')
    ?.textContent?.trim();
  const publisherId = document
    .querySelector('.topics_bk .avatar:first-child p:nth-child(2) a')
    ?.getAttribute('href')
    ?.trim()
    .split('/')
    .at(-1);

  const fansubAvatar =
    document.querySelector('.topics_bk .avatar:nth-child(2) img')?.getAttribute('src')?.trim() ??
    'https://share.dmhy.org/images/defaultTeam.gif';
  const fansubName = document
    .querySelector('.topics_bk .avatar:nth-child(2) p:nth-child(2) a')
    ?.textContent?.trim();
  const fansubId = document
    .querySelector('.topics_bk .avatar:nth-child(2) p:nth-child(2) a')
    ?.getAttribute('href')
    ?.trim()
    .split('/')
    .at(-1);

  const description = document.querySelector('.topic-nfo')?.innerHTML.trim() ?? '';

  const magnetUser =
    document
      .querySelector('#resource-tabs #tabs-1 p:nth-child(1) a')
      ?.getAttribute('href')
      ?.trim() ?? '';
  const magnetHref = document.querySelector('#a_magnet')?.getAttribute('href')?.trim() ?? '';
  const magnetHref2 = document.querySelector('#magnet2')?.getAttribute('href')?.trim() ?? '';
  const magnetDdplay = document.getElementById('ddplay')?.textContent?.trim() ?? '';

  let hasMoreFiles = false;
  const files = [...document.querySelectorAll('.file_list li')]
    .map((el) => {
      const size = [...el.children].find((n) => n.tagName === 'SPAN')?.textContent?.trim() ?? '';
      const name = el?.textContent
        ?.trim()
        .replace(new RegExp(`${size}$`), '')
        .trim()!;
      return { size, name };
    })
    .filter((f) => f.size !== '種子可能不存在' && f.size !== 'Bytes' && f.name)
    .filter((f) => {
      if (/More Than \d+ Files/.test(f.name)) {
        hasMoreFiles = true;
      }
      return !!f.size;
    });

  return {
    provider: 'dmhy',
    providerId: matchId[1],
    title: title,
    href: url.href,
    type,
    size,
    createdAt,
    publisher:
      publisherId !== undefined && publisherName !== undefined
        ? {
            id: publisherId,
            name: publisherName,
            avatar: publisherAvatar.replace(
              '/images/defaultUser.png',
              'https://share.dmhy.org/images/defaultUser.png'
            )
          }
        : undefined,
    fansub:
      fansubId !== undefined && fansubName !== undefined
        ? {
            id: fansubId,
            name: fansubName,
            avatar: fansubAvatar.replace(
              '/images/defaultTeam.gif',
              'https://share.dmhy.org/images/defaultTeam.gif'
            )
          }
        : undefined,
    description,
    magnets: [
      {
        name: '会员专用链接',
        url: magnetUser.startsWith('https://') ? magnetUser : `https:${magnetUser}`
      },
      {
        name: '磁力链接',
        url: magnetHref
      },
      {
        name: '磁力链接 type II',
        url: magnetHref2
      },
      {
        name: '弹幕播放链接',
        url: magnetDdplay
      }
    ],
    files,
    hasMoreFiles
  };
}

const SimpleType: Record<string, string> = {
  动画: '动画',
  季度全集: '合集',
  音乐: '音乐',
  动漫音乐: '音乐',
  同人音乐: '音乐',
  流行音乐: '音乐',
  日剧: '日剧',
  RAW: 'RAW',
  其他: '其他',
  漫画: '漫画',
  港台原版: '漫画',
  日文原版: '漫画',
  游戏: '游戏',
  电脑游戏: '游戏',
  主机游戏: '游戏',
  掌机游戏: '游戏',
  网络游戏: '游戏',
  游戏周边: '游戏',
  特摄: '特摄'
};

const DisplayType: Record<string, string> = {
  動畫: '动画',
  季度全集: '季度全集',
  音樂: '音乐',
  動漫音樂: '动漫音乐',
  同人音樂: '同人音乐',
  流行音樂: '流行音乐',
  日劇: '日剧',
  ＲＡＷ: 'RAW',
  其他: '其他',
  漫畫: '漫画',
  港台原版: '港台原版',
  日文原版: '日文原版',
  遊戲: '游戏',
  電腦遊戲: '电脑游戏',
  電視遊戲: '主机游戏',
  掌機遊戲: '掌机游戏',
  網絡遊戲: '网络游戏',
  遊戲周邊: '游戏周边',
  特攝: '特摄'
};
