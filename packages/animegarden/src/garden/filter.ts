import type { Resource } from '../types';

import type { FilterOptions } from './types';

import { parseSearchURL } from './url';
import { normalizeTitle } from './utils';

export function makeResourcesFilter(
  options: Omit<FilterOptions, 'page' | 'pageSize'>
): (resource: Resource) => boolean {
  const resolved = parseSearchURL(new URLSearchParams(), options);
  const chains: Array<(resource: Resource) => boolean> = [];

  if (resolved.provider) {
    const providers = resolved.provider;
    chains.push((r) => providers.includes(r.provider));
  }
  if (resolved.fansubId) {
    const fansubId = resolved.fansubId.map((id) => '' + id);
    chains.push((r) => (r.fansub ? fansubId.includes(r.fansub.id) : false));
  }
  if (resolved.fansubName) {
    const fansubName = resolved.fansubName;
    chains.push((r) => (r.fansub ? fansubName.includes(r.fansub.name) : false));
  }
  if (resolved.publisherId) {
    const publisherId = resolved.publisherId.map((id) => '' + id);
    chains.push((r) => publisherId.includes(r.publisher.id));
  }
  if (resolved.type) {
    const type = resolved.type;
    chains.push((r) => r.type === type);
  }
  if (resolved.before) {
    const before = resolved.before.getTime();
    chains.push((r) => new Date(r.createdAt).getTime() <= before);
  }
  if (resolved.after) {
    const after = resolved.after.getTime();
    chains.push((r) => new Date(r.createdAt).getTime() >= after);
  }

  if (resolved.search) {
    // Match at least one search keyword
    const search = resolved.search.map((k) => normalizeTitle(k).toLowerCase());
    chains.push((r) => {
      const titleAlt = normalizeTitle(r.title).toLowerCase();
      return search.some((key) => titleAlt.indexOf(key) !== -1);
    });
  } else if (resolved.include) {
    // Match exact at least one of the keywords, and no excluded keywords
    const include = resolved.include.map((k) => normalizeTitle(k).toLowerCase());
    const exclude = (resolved.exclude ?? []).map((k) => normalizeTitle(k).toLowerCase());
    chains.push((r) => {
      const titleAlt = normalizeTitle(r.title).toLowerCase();
      const matched = include.some((key) => titleAlt.indexOf(key) !== -1);
      if (matched) {
        return exclude.every((key) => titleAlt.indexOf(key) === -1);
      } else {
        return false;
      }
    });
  }

  return (res) => chains.every((fn) => fn(res));
}
