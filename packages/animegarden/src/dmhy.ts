import { load } from 'cheerio';

import type { Resource, ResourceType } from './types';

export interface FetchDmhyOptions {
  page?: number;

  retry?: number;
}

export async function fetchDmhyPage(
  ofetch: (request: string) => Promise<Response>,
  options: FetchDmhyOptions = {}
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

async function retryFn<T>(fn: () => Promise<T>, count: number): Promise<T> {
  if (count < 0) {
    count = Number.MAX_SAFE_INTEGER;
  }
  let e: any;
  for (let i = 0; i < count; i++) {
    try {
      return await fn();
    } catch (err) {
      e = err;
    }
  }
  throw e;
}
