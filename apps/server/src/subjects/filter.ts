import { normalizeTitle } from '@animegarden/client';
import { and, gte, ilike, lte, notIlike, or } from 'drizzle-orm';

import { resources } from '../schema/resources.ts';
import type { Subject } from './schema.ts';

export type NormalizedSubjectSearch = {
  include: string[];
  keywords: string[];
  exclude: string[];
  after?: number;
  before?: number;
};

/** Normalize a bgmx search condition for matching against resources.titleAlt. */
export function normalizeSubjectSearch(search: Subject['search']): NormalizedSubjectSearch {
  const normalize = (values: string[] | undefined) =>
    [...new Set((values ?? []).map((value) => normalizeTitle(value).trim().toLowerCase()))].filter(
      Boolean
    );

  return {
    include: normalize(search.include),
    keywords: normalize(search.keywords),
    exclude: normalize(search.exclude),
    after: search.after,
    before: search.before
  };
}

/** Compare the effective bgmx search semantics without depending on JSON key order. */
export function isSameSubjectSearch(lhs: Subject['search'], rhs: Subject['search']) {
  const left = normalizeSubjectSearch(lhs);
  const right = normalizeSubjectSearch(rhs);
  const sameValues = (a: string[], b: string[]) =>
    a.length === b.length && a.every((value) => b.includes(value));

  return (
    sameValues(left.include, right.include) &&
    sameValues(left.keywords, right.keywords) &&
    sameValues(left.exclude, right.exclude) &&
    left.after === right.after &&
    left.before === right.before
  );
}

/** Match one resource using the same include/keywords/exclude/time semantics as bgmx. */
export function matchesSubjectSearch(search: Subject['search'], title: string, createdAt: Date) {
  const normalized = normalizeSubjectSearch(search);
  const normalizedTitle = normalizeTitle(title).toLowerCase();
  const createdAtTime = createdAt.getTime();

  return (
    normalized.include.some((value) => normalizedTitle.includes(value)) &&
    normalized.keywords.every((value) => normalizedTitle.includes(value)) &&
    normalized.exclude.every((value) => !normalizedTitle.includes(value)) &&
    (normalized.after === undefined || createdAtTime >= normalized.after) &&
    (normalized.before === undefined || createdAtTime <= normalized.before)
  );
}

/** Build the SQL equivalent of matchesSubjectSearch for historical resource indexing. */
export function buildSubjectSearchSql(search: Subject['search']) {
  const normalized = normalizeSubjectSearch(search);
  if (normalized.include.length === 0) return undefined;

  return and(
    or(...normalized.include.map((value) => ilike(resources.titleAlt, toLikePattern(value)))),
    ...normalized.keywords.map((value) => ilike(resources.titleAlt, toLikePattern(value))),
    ...normalized.exclude.map((value) => notIlike(resources.titleAlt, toLikePattern(value))),
    normalized.after === undefined
      ? undefined
      : gte(resources.createdAt, new Date(normalized.after)),
    normalized.before === undefined
      ? undefined
      : lte(resources.createdAt, new Date(normalized.before))
  );
}

/** Escape PostgreSQL LIKE metacharacters so subject search terms are matched literally. */
function toLikePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}
