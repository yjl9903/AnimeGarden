import { load } from 'cheerio';

import type { Resource, ResourceDetail, ResourceType } from './types';

import { retryFn } from './utils';

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
): Promise<Resource[]> {
  const { page = 1, retry = 5 } = options;

  const html = await retryFn(
    () => ofetch(`https://share.dmhy.org/topics/list/page/${page}`).then((r) => r.text()),
    retry
  );
  const $ = load(html);

  const res: Resource[] = [];
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
): Promise<ResourceDetail> {
  const url = new URL(href, `https://share.dmhy.org/topics/view/`);
  const { retry = 5 } = options;

  const html = await retryFn(() => ofetch(url.href).then((r) => r.text()), retry);
  const $ = load(html);

  const title = $('.topic-main>.topic-title>h3').text().trim();
  const type = $('.topic-main>.topic-title li:first-child a:last-of-type').text().trim();

  const size = $('.topic-main>.topic-title li:nth-child(4) span').text().trim();
  const createdAt = $('.topic-main>.topic-title li:nth-child(2) span').text().trim();

  const publisherAvatar = $('.topics_bk .avatar:first-child img').attr('src')?.trim() ?? '';
  const publisherName = $('.topics_bk .avatar:first-child p:nth-child(2) a').text().trim();
  const publisherId = $('.topics_bk .avatar:first-child p:nth-child(2) a')
    .attr('href')
    ?.trim()
    .split('/')
    .at(-1)!;

  const fansubAvatar = $('.topics_bk .avatar:nth-child(2) img').attr('src')?.trim() ?? '';
  const fansubName = $('.topics_bk .avatar:nth-child(2) p:nth-child(2) a').text().trim();
  const fansubId = $('.topics_bk .avatar:nth-child(2) p:nth-child(2) a')
    .attr('href')
    ?.trim()
    .split('/')
    .at(-1);

  const description = $('.topic-nfo').html()?.trim() ?? '';

  return {
    title,
    href: url.href,
    type,
    size,
    createdAt,
    publisher: {
      id: publisherId,
      name: publisherName,
      avatar: publisherAvatar
    },
    fansub:
      fansubId !== undefined
        ? {
            id: fansubId,
            name: fansubName,
            avatar: fansubAvatar
          }
        : undefined,
    description
  };
}
