import { JSDOM } from 'jsdom';

import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { retryFn } from '@animegarden/shared';

import { NetworkError } from '../error';
import { removeExtraSpaces, splitOnce } from '../utils';

import { parseTimeString } from './utils';

export interface FetchMikanPageOptions {
  baseURL?: string;

  page?: number;

  retry?: number;
}

export interface FetchMikanDetailOptions {
  retry?: number;
}

export async function fetchMikanPage(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  options: FetchMikanPageOptions = {}
): Promise<ScrapedResource[]> {
  const { baseURL = 'https://mikanani.kas.pub', page = 1, retry = 5 } = options;

  const resp = await retryFn(async () => {
    const url = `${baseURL}/Home/Classic/${page}`;
    const resp = await ofetch(url, {
      headers: new Headers([
        [
          'User-Agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ]
      ])
    });
    if (!resp.ok) {
      throw new NetworkError('mikan', url, resp);
    }
    return resp;
  }, retry);

  const html = await resp.text();
  const { document } = new JSDOM(html).window;

  const res: ScrapedResource[] = [];

  // 选择表格中的所有数据行
  const rows = document.querySelectorAll('#sk-body .table tbody tr');

  for (const row of rows) {
    const tds = [...row.querySelectorAll('td')];

    if (tds.length < 6) {
      continue;
    }

    // 解析更新时间
    const rawCreatedAt = tds[0].textContent?.trim();
    if (!rawCreatedAt) {
      continue;
    }

    const createdAt = parseTimeString(rawCreatedAt);

    // 解析字幕组信息
    const fansubLink = tds[1].querySelector('a');
    let fansubName = fansubLink?.textContent?.trim();
    let fansubId = fansubLink?.getAttribute('href')?.split('/').pop();

    // 如果没有字幕组链接，直接过滤掉
    if (!fansubLink) {
      continue
    }

    // 解析番组名和链接
    const titleLink = tds[2].querySelector('a[href*="/Home/Episode/"]');
    if (!titleLink) {
      continue;
    }

    const title = removeExtraSpaces(titleLink.textContent?.trim() || '');
    if (!title) {
      continue;
    }

    const episodeHref = titleLink.getAttribute('href');
    if (!episodeHref) {
      continue;
    }

    // 提取 providerId
    const providerId = episodeHref.split('/').pop();
    if (!providerId) {
      continue;
    }

    // 解析磁力链接
    const magnetLink = tds[2].querySelector('a.js-magnet');
    const magnetFull = magnetLink?.getAttribute('data-clipboard-text');
    if (!magnetFull) {
      continue;
    }

    const [magnet, tracker] = splitOnce(magnetFull, '&');

    // 解析文件大小
    const size = tds[3].textContent?.trim() || '';

    // 默认类型为动画
    const type = '动画';

    res.push({
      provider: 'mikan',
      providerId,
      title,
      href: episodeHref,
      type,
      magnet,
      tracker,
      size,
      fansub: fansubId && fansubName ? { id: fansubId, name: fansubName } : undefined,
      publisher: fansubId && fansubName ? { id: fansubId, name: fansubName } : undefined,
      createdAt
    });
  }

  return res;
}

export async function fetchMikanDetail(
  ofetch: (request: string) => Promise<Response>,
  href: string,
  options: FetchMikanDetailOptions = {}
): Promise<ScrapedResourceDetail | undefined> {
  throw new Error('Not implemented');
}
