import { z } from 'zod';

import { QueryType } from './constant';
import { normalizeTitle } from './utils';
import { FilterOptions, ResolvedFilterOptions } from './types';

const dateLike = z
  .union([z.coerce.number().transform((n) => new Date(n)), z.coerce.date()])
  .optional();

const stringArray = z.union([z.string().transform((s) => [s]), z.array(z.string())]);
const stringArrayLike = z.coerce
  .string()
  .transform((t) => JSON.parse(t))
  .catch(undefined)
  .pipe(stringArray)
  .optional();
const stringArrayArray = z.union([
  z.string().transform((s) => [[s]]),
  z.array(stringArray).default([])
]);

export const FilterSchema = z.object({
  page: z
    .number()
    .default(1)
    .refine((p) => p >= 1),
  pageSize: z
    .number()
    .default(100)
    .refine((ps) => 1 <= ps && ps <= 1000),
  fansubId: z.number().optional(),
  publisherId: z.number().optional(),
  type: z.string().optional(),
  before: z.date().optional(),
  after: z.date().optional(),
  search: stringArray.optional(),
  include: stringArrayArray.optional(),
  exclude: stringArray.optional()
});

const parser = {
  page: z.coerce
    .number()
    .default(1)
    .transform((p) => Math.round(Math.max(1, p))),
  pageSize: z.coerce
    .number()
    .default(100)
    .transform((ps) => Math.round(Math.max(1, Math.min(1000, ps)))),
  fansubId: z.coerce.number().optional(),
  publisherId: z.coerce.number().optional(),
  type: z.coerce.string().optional(),
  before: dateLike,
  after: dateLike,
  search: stringArrayLike,
  include: z.coerce
    .string()
    .transform((t) => JSON.parse(t))
    .catch(undefined)
    .pipe(stringArrayArray)
    .optional(),
  exclude: stringArrayLike
};

type ParserKey = keyof typeof parser;

export function parseSearchURL(
  params: URLSearchParams,
  body?: FilterOptions
): ResolvedFilterOptions {
  const entries = [...Object.entries(parser)].map(([key, parser]) => {
    if (body && typeof body === 'object') {
      const content = body[key as ParserKey];
      if (content !== null && content !== undefined) {
        const parser2 = FilterSchema.shape[key as ParserKey];
        const parsed = parser2.safeParse(content);
        if (parsed.success) {
          return [key, parsed.data];
        }
      }
    }
    {
      const content = params.get(key);
      if (content !== null && content !== '') {
        const parsed = parser.safeParse(content);
        if (parsed.success) {
          return [key, parsed.data];
        }
      }
    }
    return [key, undefined];
  });

  const filtered = Object.fromEntries(entries) as ResolvedFilterOptions;

  if (filtered.search) {
    const MIN_LEN = 4;

    const newSearch: string[] = [];
    const newInclude: string[][] = filtered.include ?? [];
    const newExclude: string[] = filtered.exclude ?? [];

    for (const text of filtered.search) {
      const word = normalizeTitle(text)
        .replace(/^(\+|-)?"([^"]*)"$/, '$1$2')
        .replace(/%2b/g, '+');
      if (word[0] === '+') {
        if (word.length - 1 <= MIN_LEN) {
          newInclude.push([word.slice(1)]);
        } else {
          newExclude.push(`+"${word.slice(1)}"`);
        }
      } else if (word[0] === '-') {
        if (word.length - 1 <= MIN_LEN) {
          newExclude.push(word.slice(1));
        } else {
          newSearch.push(`-"${word.slice(1)}"`);
        }
      } else {
        if (word.length <= MIN_LEN) {
          newInclude.push([word]);
        } else {
          newSearch.push(`"${word}"`);
        }
      }
    }

    filtered.search = newSearch;
    if (newInclude.length > 0) {
      filtered.include = newInclude;
    }
    if (newExclude.length > 0) {
      filtered.exclude = newExclude;
    }
  }

  const isNaN = (d: unknown): boolean => d === undefined || d === null || Number.isNaN(d);
  if (isNaN(filtered.page)) {
    filtered.page = 1;
  }
  if (isNaN(filtered.pageSize)) {
    filtered.pageSize = 100;
  }

  return filtered;
}

export function stringifySearchURL(baseURL: string, options: FilterOptions): URL {
  const url = new URL('resources', baseURL);

  if (options.page) {
    url.searchParams.set('page', '' + options.page);
  }
  if (options.pageSize) {
    url.searchParams.set('pageSize', '' + options.pageSize);
  }
  if (options.fansubId) {
    url.searchParams.set('fansubId', '' + options.fansubId);
  }
  if (options.publisherId) {
    url.searchParams.set('publisherId', '' + options.publisherId);
  }
  if (options.type) {
    const type = options.type;
    url.searchParams.set('type', type in QueryType ? QueryType[type] : type);
  }
  if (options.before) {
    url.searchParams.set('before', '' + options.before.getTime());
  }
  if (options.after) {
    url.searchParams.set('after', '' + options.after.getTime());
  }
  if (options.search && options.search.length > 0) {
    url.searchParams.set('search', JSON.stringify(options.search ?? []));
  }
  if (options.include && options.include.length > 0) {
    url.searchParams.set('include', JSON.stringify(options.include ?? []));
  }
  if (options.exclude && options.exclude.length > 0) {
    url.searchParams.set('exclude', JSON.stringify(options.exclude ?? []));
  }

  return url;
}
