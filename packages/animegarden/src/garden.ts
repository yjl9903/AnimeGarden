import type { Resource } from './types';

export interface FetchOptions {
  baseURL?: string;

  fansub?: string;

  publisher?: string;

  type?: string;

  before?: Date;

  after?: Date;

  /**
   * Query the specified page
   */
  page?: number;

  /**
   * Query count resources
   */
  count?: number;
}

/**
 * Fetch resources data from dmhy mirror site
 */
export async function fetchResources(
  fetch: (request: string) => Promise<Response>,
  options: FetchOptions = {}
) {
  const { baseURL = 'https://garden.onekuma.cn/api/' } = options;

  const url = new URL('resources', baseURL);
  if (options.fansub) {
    url.searchParams.set('fansub', '' + options.fansub);
  }
  if (options.publisher) {
    url.searchParams.set('publisher', '' + options.publisher);
  }
  if (options.type) {
    url.searchParams.set('type', '' + options.type);
  }
  if (options.before) {
    url.searchParams.set('before', '' + options.before.getTime());
  }
  if (options.after) {
    url.searchParams.set('after', '' + options.after.getTime());
  }

  if (options.count) {
    const map = new Map<string, Resource>();
    let timestamp = new Date(0);
    for (let page = 1; map.size < options.count; page++) {
      url.searchParams.set('page', '' + page);
      const resp = await fetch(url.toString())
        .then((r) => r.json())
        .then((r) => {
          timestamp = new Date(r.timestamp);
          return r.resources as Resource[];
        });
      for (const r of resp) {
        map.set(r.href, r);
      }
    }
    return {
      resources: [...map.values()].sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt)),
      timestamp
    };
  } else {
    url.searchParams.set('page', '' + (options.page ?? 1));
    return await fetch(url.toString())
      .then((r) => r.json())
      .then((r) => ({ resources: r.resources as Resource[], timestam: new Date(r.timestamp) }));
  }
}
