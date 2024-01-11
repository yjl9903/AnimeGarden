import { load } from 'cheerio';

import type { FetchedResource, ResourceDetail, ResourceType } from 'animegarden';

import { retryFn } from 'animegarden';

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
): Promise<FetchedResource[]> {
  const { page = 1, retry = 5 } = options;

  const resp = await retryFn(async () => {
    const resp = await ofetch(`https://share.dmhy.org/topics/list/page/${page}`);
    if (!resp.ok) {
      throw new Error(resp.statusText, { cause: resp });
    }
    return resp;
  }, retry);
  if (!resp.ok) {
    throw new Error('Failed connecting https://share.dmhy.org');
  }

  const html = await resp.text();
  const $ = load(html);

  const errorNode = $('.ui-state-error');
  if (errorNode.length !== 0) {
    throw new Error('dmhy server is down');
  }

  const res: FetchedResource[] = [];
  $('#topic_list tbody tr').each((_idx, row) => {
    const tds = $(row).find('td');
    const createdAt = tds.eq(0).find('span').text().trim();
    const type = tds.eq(1).text().trim() as ResourceType;
    const title = tds.eq(2).children('a').text().trim();
    const href = 'https://share.dmhy.org' + tds.eq(2).children('a').attr('href')!.trim();
    const fansub = tds.eq(2).find('span.tag a');
    const fansubName = fansub.text().trim();
    const fansubId = fansub.attr('href')?.split('/').at(-1);
    const magnet = tds.eq(3).find('a').attr('href')!;
    const size = tds.eq(4).text().trim();
    const publisher = tds.eq(8).find('a');
    const publisherName = publisher.text();
    const publisherId = publisher.attr('href')!.split('/').at(-1)!;

    res.push({
      provider: 'dmhy',
      title,
      href,
      type,
      magnet,
      size,
      fansub: fansubId ? { id: fansubId, name: fansubName } : undefined,
      publisher: { id: publisherId, name: publisherName },
      createdAt
    });
  });
  return res;
}

export async function fetchDmhyDetail(
  ofetch: (request: string) => Promise<Response>,
  href: string,
  options: FetchDmhyDetailOptions = {}
): Promise<ResourceDetail | undefined> {
  const url = new URL(href, `https://share.dmhy.org/topics/view/`);
  const lastHref = url.href.split('/').at(-1);
  if (!lastHref) return undefined;
  const matchId = /^(\d+)/.exec(lastHref);
  if (!matchId) return undefined;

  const { retry = 5 } = options;
  const resp = await retryFn(() => ofetch(url.href), retry);
  if (!resp.ok) {
    throw new Error('Failed connecting https://share.dmhy.org');
  }

  const html = await resp.text();
  const $ = load(html);

  const errorNode = $('.ui-state-error');
  if (errorNode.length !== 0) {
    throw new Error('dmhy server is down');
  }

  const title = $('.topic-main>.topic-title>h3').text().trim();

  // Resource may be deleted
  if (!title) {
    return undefined;
  }

  const type = $('.topic-main>.topic-title li:first-child a:last-of-type').text().trim();

  const size = $('.topic-main>.topic-title li:nth-child(4) span').text().trim();
  const createdAt = $('.topic-main>.topic-title li:nth-child(2) span').text().trim();

  const publisherAvatar =
    $('.topics_bk .avatar:first-child img').attr('src')?.trim() ??
    'https://share.dmhy.org/images/defaultUser.png';
  const publisherName = $('.topics_bk .avatar:first-child p:nth-child(2) a').text().trim();
  const publisherId = $('.topics_bk .avatar:first-child p:nth-child(2) a')
    .attr('href')
    ?.trim()
    .split('/')
    .at(-1)!;

  const fansubAvatar =
    $('.topics_bk .avatar:nth-child(2) img').attr('src')?.trim() ??
    'https://share.dmhy.org/images/defaultTeam.gif';
  const fansubName = $('.topics_bk .avatar:nth-child(2) p:nth-child(2) a').text().trim();
  const fansubId = $('.topics_bk .avatar:nth-child(2) p:nth-child(2) a')
    .attr('href')
    ?.trim()
    .split('/')
    .at(-1);

  const description = $('.topic-nfo').html()?.trim() ?? '';

  const magnetUser = $('#resource-tabs #tabs-1 p:nth-child(1) a').attr('href')?.trim() ?? '';
  const magnetHref = $('#a_magnet').attr('href')?.trim() ?? '';
  const magnetHref2 = $('#magnet2').attr('href')?.trim() ?? '';
  const magnetDdplay = $('#ddplay').attr('href')?.trim() ?? '';

  let hasMoreFiles = false;
  const files = $('.file_list li')
    .map((_idx, el) => {
      const size = $(el).children('span').text().trim();
      const name = $(el)
        .text()
        .trim()
        .replace(new RegExp(`${size}$`), '')
        .trim();
      return { size, name };
    })
    .toArray()
    .filter((f) => f.size !== '種子可能不存在' && f.size !== 'Bytes')
    .filter((f) => {
      if (/More Than \d+ Files/.test(f.name)) {
        hasMoreFiles = true;
      }
      return !!f.size;
    });

  return {
    title,
    href: url.href,
    type,
    size,
    createdAt,
    publisher: {
      id: publisherId,
      name: publisherName,
      avatar: publisherAvatar.replace(
        '/images/defaultUser.png',
        'https://share.dmhy.org/images/defaultUser.png'
      )
    },
    fansub:
      fansubId !== undefined
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
    magnet: {
      user: magnetUser.startsWith('https://') ? magnetUser : `https:${magnetUser}`,
      href: magnetHref,
      href2: magnetHref2,
      ddplay: magnetDdplay,
      files,
      hasMoreFiles
    }
  };
}
