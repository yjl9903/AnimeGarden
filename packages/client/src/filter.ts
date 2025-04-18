import type { ResolvedFilterOptions, Resource } from './types';

import { normalizeTitle } from './utils';

export function makeResourcesFilter(
  filter: Omit<ResolvedFilterOptions, 'page' | 'pageSize' | 'duplicate'>
) {
  const conds: Array<(res: Resource) => boolean> = [];

  const {
    provider,
    include,
    keywords,
    exclude,
    subjects,
    search,
    publishers,
    fansubs,
    types,
    before,
    after
  } = filter;

  if (provider) {
    conds.push((r) => r.provider === provider);
  }
  if (
    (include && include.length > 0) ||
    (keywords && keywords.length > 0) ||
    (exclude && exclude.length > 0)
  ) {
    conds.push((r) => {
      const title = normalizeTitle(r.title).toLowerCase();
      return (
        (include
          ?.map((i) => normalizeTitle(i).toLocaleLowerCase())
          .some((i) => title.indexOf(i.toLocaleLowerCase()) !== -1) ??
          true) &&
        (keywords
          ?.map((i) => normalizeTitle(i).toLocaleLowerCase())
          .every((i) => title.indexOf(i) !== -1) ??
          true) &&
        (exclude
          ?.map((i) => normalizeTitle(i).toLocaleLowerCase())
          .every((i) => title.indexOf(i) === -1) ??
          true)
      );
    });
  }
  if (subjects && subjects.length > 0) {
    conds.push((r) => subjects.some((s) => r.subjectId === s));
  }
  if (search && search.length > 0) {
    // TODO: search
  }

  if ((publishers && publishers.length > 0) || (fansubs && fansubs.length > 0)) {
    conds.push(
      (r) =>
        (publishers?.some((p) => r.publisher.name === p) ?? true) &&
        (fansubs?.some((p) => r.fansub?.name === p) ?? true)
    );
  }

  if (types && types.length > 0) {
    conds.push((r) => types.some((t) => r.type === t));
  }
  if (before) {
    const t = before.getTime();
    conds.push((r) => r.createdAt.getTime() <= t);
  }
  if (after) {
    const t = after.getTime();
    conds.push((r) => r.createdAt.getTime() >= t);
  }

  return (res: Resource) => {
    return conds.every((c) => c(res));
  };
}
