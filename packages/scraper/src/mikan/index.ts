import { JSDOM } from 'jsdom';

import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { removeExtraSpaces, retryFn, splitOnce } from '@animegarden/shared';

import { stripSuffix } from '../utils';
import { NetworkError } from '../error';

const BASE_URL = 'https://mikanani.kas.pub';
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const TITLE_PREFIX = 'Mikan Project - ';
const TITLE_SUFFIX = ' - Mikan Project';

/** Names containing an ampersand that are one Mikan group rather than a joint release. */
const MIKAN_AMPERSAND_GROUPS = new Set([
  '紫音动漫&发布组',
  '紫音動漫&發佈組',
  '天月动漫&发布组',
  '天月動漫&發佈組',
  'K&W-RAWS'
]);

/** Joint names that use a separator other than an ampersand in current Mikan data. */
const MIKAN_SPECIAL_JOINT_GROUPS = new Map([
  ['指原x樱花字幕组', '指原'],
  ['指原x櫻花字幕組', '指原'],
  ['得宗字幕组×拾月出云', '得宗字幕组']
]);

export interface FetchMikanPageOptions {
  page?: number;

  retry?: number;
}

export interface FetchMikanDetailOptions {
  retry?: number;
}

function getShanghaiDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);

  const get = (type: 'year' | 'month' | 'day') => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
      throw new TypeError(`Missing Shanghai date part: ${type}`);
    }
    return Number(value);
  };

  return {
    year: get('year'),
    month: get('month'),
    day: get('day')
  };
}

function toShanghaiISOString(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute)).toISOString();
}

function parseMikanDate(text: string, now = new Date()) {
  const raw = removeExtraSpaces(text.replace(/^发布日期[:：]\s*/, ''));
  const matchRelative = /^(今天|昨天)\s+(\d{1,2}):(\d{2})$/.exec(raw);
  if (matchRelative) {
    const { year, month, day } = getShanghaiDateParts(now);
    const dayOffset = matchRelative[1] === '昨天' ? -1 : 0;
    return toShanghaiISOString(year, month, day + dayOffset, +matchRelative[2], +matchRelative[3]);
  }

  const matchAbsolute =
    /^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?(?:\s+(\d{1,2}):(\d{2}))?$/.exec(raw);
  if (matchAbsolute) {
    return toShanghaiISOString(
      +matchAbsolute[1],
      +matchAbsolute[2],
      +matchAbsolute[3],
      +(matchAbsolute[4] ?? '0'),
      +(matchAbsolute[5] ?? '0')
    );
  }

  const matchYearless = /^(\d{1,2})[-/.月](\d{1,2})(?:日)?\s+(\d{1,2}):(\d{2})$/.exec(raw);
  if (matchYearless) {
    const { year } = getShanghaiDateParts(now);
    return toShanghaiISOString(
      year,
      +matchYearless[1],
      +matchYearless[2],
      +matchYearless[3],
      +matchYearless[4]
    );
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }

  throw new TypeError(`Unsupported Mikan date: ${text}`);
}

function resolveUrl(href: string, basePath: string) {
  return new URL(href, `${BASE_URL}${basePath}`).href;
}

function parseEpisodeId(href: string) {
  const url = new URL(href, `${BASE_URL}/Home/Episode/`);
  const match = /^\/Home\/Episode\/([^/?#]+)/.exec(url.pathname);
  return match?.[1];
}

function parseFirstPublishGroup(root: ParentNode) {
  const links = [...root.querySelectorAll<HTMLAnchorElement>('a[href*="/Home/PublishGroup/"]')];
  const first = links.find((link) =>
    /^\/Home\/PublishGroup\/[^/?#]+/.test(link.getAttribute('href') ?? '')
  );
  if (!first) {
    return undefined;
  }

  const href = first.getAttribute('href') ?? '';
  const id = /^\/Home\/PublishGroup\/([^/?#]+)/.exec(href)?.[1];
  const name = first.textContent?.trim();
  if (!id || !name) {
    return undefined;
  }

  return {
    id,
    name
  };
}

function parseTitleFromHead(document: Document) {
  const title = document.querySelector('title')?.textContent?.trim();
  if (!title) {
    return undefined;
  }
  return title.endsWith(TITLE_SUFFIX) ? title.slice(0, -TITLE_SUFFIX.length) : title;
}

/** Mikan publish-group pages put the site name before the group name. */
function parsePublishGroupNameFromHead(document: Document) {
  const title = document.querySelector('title')?.textContent?.trim();
  if (!title) {
    return undefined;
  }
  return title.startsWith(TITLE_PREFIX) ? title.slice(TITLE_PREFIX.length) : title;
}

function cleanMikanPublishGroupName(name: string) {
  return name
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replaceAll('＆', '&')
    .trim();
}

/**
 * Resolves a Mikan joint release to its first group.
 * Known single-group names keep their ampersand and are normalized later by the server.
 */
export function normalizeMikanPublishGroupName(name: string) {
  const cleaned = cleanMikanPublishGroupName(name);
  if (MIKAN_AMPERSAND_GROUPS.has(cleaned)) {
    return cleaned;
  }

  const special = MIKAN_SPECIAL_JOINT_GROUPS.get(cleaned);
  if (special) {
    return special;
  }

  return cleaned.split('&', 1)[0].trim();
}

function shouldResolveMikanPublishGroup(name: string) {
  const cleaned = cleanMikanPublishGroupName(name);
  return cleaned.includes('&') || MIKAN_SPECIAL_JOINT_GROUPS.has(cleaned);
}

/** Fetches Mikan's current group name without making a failed lookup discard the resource row. */
async function fetchMikanPublishGroupName(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  group: { id: string; name: string },
  retry: number
) {
  if (!shouldResolveMikanPublishGroup(group.name)) {
    return normalizeMikanPublishGroupName(group.name);
  }

  const url = `${BASE_URL}/Home/PublishGroup/${group.id}`;
  try {
    const resp = await retryFn(
      async () => {
        const response = await ofetch(url);
        if (!response.ok) {
          throw new NetworkError('mikan', url, response);
        }
        return response;
      },
      { count: retry }
    );
    const { document } = new JSDOM(await resp.text()).window;
    const currentName = parsePublishGroupNameFromHead(document);
    return normalizeMikanPublishGroupName(currentName ?? group.name);
  } catch {
    return normalizeMikanPublishGroupName(group.name);
  }
}

/** Cleans Mikan's detail HTML and makes embedded image URLs safe to render off-site. */
function parseDetailDescription(element: Element, baseUrl: string) {
  const clone = element.cloneNode(true) as Element;

  for (const ad of clone.querySelectorAll('div')) {
    if (
      ad.querySelector('img[src*="/images/SSWJ/"]') ||
      ad.querySelector('a[href*="equity.tmall.com"]')
    ) {
      ad.remove();
    }
  }

  // Mikan descriptions often use root-relative image paths, which break outside its origin.
  for (const image of clone.querySelectorAll<HTMLImageElement>('img[src]')) {
    const src = image.getAttribute('src')?.trim();
    if (!src) {
      continue;
    }

    try {
      image.setAttribute('src', new URL(src, baseUrl).href);
    } catch {
      // Keep malformed URLs unchanged so one bad image does not discard the whole description.
    }
  }

  return `<h2 class="text-xl font-bold">简介</h2>${clone.innerHTML.trim()}`;
}

function findBangumiInfoValue(document: Document, label: string) {
  const text = [...document.querySelectorAll('.bangumi-info')]
    .map((node) => node.textContent?.trim() ?? '')
    .find((value) => value.startsWith(label));

  if (!text) {
    return undefined;
  }

  return text.replace(new RegExp(`^${label}[:：]\\s*`), '');
}

export async function fetchMikanPage(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  options: FetchMikanPageOptions = {}
): Promise<ScrapedResource[]> {
  const { page = 1, retry = 5 } = options;
  const url = `${BASE_URL}/Home/Classic/${page}`;
  const now = new Date();

  const resp = await retryFn(
    async () => {
      const response = await ofetch(url);
      if (!response.ok) {
        throw new NetworkError('mikan', url, response);
      }
      return response;
    },
    { count: retry }
  );

  const { document } = new JSDOM(await resp.text()).window;

  const result: ScrapedResource[] = [];
  const groupNames = new Map<string, Promise<string>>();
  for (const row of document.querySelectorAll('table.table tbody tr')) {
    const tds = [...row.querySelectorAll('td')];
    if (tds.length < 4) {
      continue;
    }

    const titleNode = tds[2].querySelector<HTMLAnchorElement>('a[href*="/Home/Episode/"]');
    let title = titleNode?.textContent?.trim();
    const href = titleNode?.getAttribute('href')?.trim();
    const providerId = href ? parseEpisodeId(href) : undefined;
    if (!title || !providerId) {
      continue;
    }

    const magnetFull =
      tds[2].querySelector<HTMLElement>('[data-clipboard-text]')?.dataset.clipboardText;
    if (!magnetFull) {
      continue;
    }
    const [magnet, tracker] = splitOnce(magnetFull, '&');

    const rawCreatedAt = tds[0].textContent?.trim();
    if (!rawCreatedAt) {
      continue;
    }

    let createdAt: string;
    try {
      createdAt = parseMikanDate(rawCreatedAt, now);
    } catch {
      continue;
    }

    const parsedGroup = parseFirstPublishGroup(tds[1]);
    let group = parsedGroup;
    if (parsedGroup) {
      let resolved = groupNames.get(parsedGroup.id);
      if (!resolved) {
        resolved = fetchMikanPublishGroupName(ofetch, parsedGroup, retry);
        groupNames.set(parsedGroup.id, resolved);
      }
      group = {
        ...parsedGroup,
        name: await resolved
      };
    }

    // 剔除零宽空格, 清洗字幕组笔误
    title = title
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[\[/g, '[')
      .replace(/\]\]/g, ']');

    // @hack
    if (group?.name === 'ANi') {
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

    // @hack 删除末尾的 v2
    if (title.endsWith('v2')) {
      title = title.slice(0, title.length - 2).trimEnd();
    }

    result.push({
      provider: 'mikan',
      providerId,
      title: title,
      href: providerId,
      type: '动画',
      magnet,
      tracker,
      size: tds[3].textContent?.trim() ?? '',
      publisher: group,
      fansub: group,
      createdAt
    });
  }

  return result;
}

export async function fetchMikanDetail(
  ofetch: (request: string, init?: RequestInit) => Promise<Response>,
  href: string,
  options: FetchMikanDetailOptions = {}
): Promise<ScrapedResourceDetail | undefined> {
  const url = new URL(href, `${BASE_URL}/Home/Episode/`);
  const providerId = parseEpisodeId(url.href);
  if (!providerId) {
    return undefined;
  }
  const now = new Date();

  const { retry = 5 } = options;
  const resp = await retryFn(
    async () => {
      const response = await ofetch(url.href);
      if (!response.ok) {
        throw new NetworkError('mikan', url.href, response);
      }
      return response;
    },
    { count: retry }
  );

  const { document } = new JSDOM(await resp.text()).window;

  const title =
    parseTitleFromHead(document) ?? document.querySelector('.episode-title')?.textContent?.trim();

  if (!title) {
    return undefined;
  }

  const descriptionElement = document.querySelector('.episode-desc');
  if (!descriptionElement) {
    return undefined;
  }

  const rawCreatedAt = findBangumiInfoValue(document, '发布日期');
  if (!rawCreatedAt) {
    return undefined;
  }

  let createdAt: string;
  try {
    createdAt = parseMikanDate(rawCreatedAt, now);
  } catch {
    return undefined;
  }

  const size = findBangumiInfoValue(document, '文件大小') ?? '';

  const parsedGroup = parseFirstPublishGroup(
    document.querySelector('.leftbar-container') ?? document
  );
  const group = parsedGroup
    ? {
        ...parsedGroup,
        name: await fetchMikanPublishGroupName(ofetch, parsedGroup, retry)
      }
    : undefined;
  const fullMagnet = document.querySelector<HTMLAnchorElement>(
    '.leftbar-nav a[href^="magnet:"]'
  )?.href;
  if (!fullMagnet) {
    return undefined;
  }

  const downloadHref = document
    .querySelector<HTMLAnchorElement>('.leftbar-nav a[href$=".torrent"]')
    ?.getAttribute('href')
    ?.trim();

  return {
    provider: 'mikan',
    providerId,
    title,
    href: url.href,
    description: parseDetailDescription(descriptionElement, url.href),
    type: '动画',
    size,
    publisher: group,
    fansub: group,
    createdAt,
    magnets: [
      ...(downloadHref
        ? [
            {
              name: '种子',
              url: resolveUrl(downloadHref, '/')
            }
          ]
        : []),
      {
        name: '磁力链接',
        url: fullMagnet
      }
    ],
    files: [],
    hasMoreFiles: false
  };
}
