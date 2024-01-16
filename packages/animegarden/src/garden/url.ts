import { z } from 'zod';

import { QueryType } from './constant';
// import { normalizeTitle } from './utils';
import { FilterOptions, ResolvedFilterOptions } from './types';

const dateLike = z
  .union([z.coerce.number().transform((n) => new Date(n)), z.coerce.date()])
  .optional();

const stringArray = z.union([z.string().transform((s) => [s]), z.array(z.string())]);
const stringArrayLike = z.coerce
  .string()
  .transform((t) => {
    try {
      return JSON.parse(t);
    } catch {
      return [t];
    }
  })
  .pipe(stringArray)
  .optional();

// const stringArrayArray = z.union([
//   z.string().transform((s) => [[s]]),
//   z.array(stringArray).default([])
// ]);

// const numberArray = z.union([z.array(z.coerce.number()), z.coerce.number().transform((n) => [n])]);
// const numberArrayLike = z.coerce
//   .string()
//   .transform((t) => JSON.parse(t))
//   .catch(undefined)
//   .pipe(numberArray)
//   .optional();

const providerEnum = z.enum(['dmhy', 'moe']);
const providerLike = z
  .union([
    providerEnum.transform((t) => [t]),
    z.coerce
      .string()
      .transform((t) => {
        try {
          return JSON.parse(t);
        } catch {
          return [t];
        }
      })
      .pipe(z.array(providerEnum)),
    z.array(providerEnum)
  ])
  .transform((t) => [...new Set(t)]);

export const FilterSchema = z.object({
  provider: providerLike.optional(),
  duplicate: z.coerce.boolean().optional(),
  page: z
    .number()
    .default(1)
    .refine((p) => p >= 1),
  pageSize: z
    .number()
    .default(100)
    .refine((ps) => 1 <= ps && ps <= 1000),
  fansubId: z.string().array().optional(),
  fansubName: z.string().array().optional(),
  publisherId: z.string().array().optional(),
  type: z.string().optional(),
  before: dateLike,
  after: dateLike,
  search: stringArray.optional(),
  include: stringArray.optional(),
  exclude: stringArray.optional()
});

const parser = {
  provider: providerLike.default(['dmhy', 'moe']),
  duplicate: z.coerce.boolean().default(false),
  page: z.coerce
    .number()
    .default(1)
    .transform((p) => Math.round(Math.max(1, p))),
  pageSize: z.coerce
    .number()
    .default(100)
    .transform((ps) => Math.round(Math.max(1, Math.min(1000, ps)))),
  fansubId: stringArrayLike,
  fansubName: stringArrayLike,
  publisherId: stringArrayLike,
  type: z.coerce.string().optional(),
  before: dateLike,
  after: dateLike,
  search: stringArrayLike,
  include: stringArrayLike,
  exclude: stringArrayLike
};

type ParserKey = keyof typeof parser;

export function parseSearchURL(
  params: URLSearchParams,
  body?: FilterOptions
): ResolvedFilterOptions {
  const entries = [...Object.entries(parser)].map(([key, parser]) => {
    // Try parsing body
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
    // Try parsing params
    {
      const content = params.get(key);
      if (content !== null && content !== '') {
        const parsed = parser.safeParse(content);
        if (parsed.success) {
          return [key, parsed.data];
        } else {
        }
      }
    }
    return [key, undefined];
  });

  const filtered = Object.fromEntries(entries) as ResolvedFilterOptions;

  const isNaN = (d: unknown): boolean => d === undefined || d === null || Number.isNaN(d);
  if (isNaN(filtered.page)) {
    filtered.page = 1;
  }
  if (isNaN(filtered.pageSize)) {
    filtered.pageSize = 100;
  }
  if (filtered.duplicate === undefined || filtered.duplicate === null) {
    if (filtered.provider && filtered.provider.length === 1) {
      filtered.duplicate = true;
    } else {
      filtered.duplicate = false;
    }
  }

  return filtered;
}

export function stringifySearchURL(baseURL: string, options: FilterOptions): URL {
  const url = new URL('resources', baseURL);

  if (options.provider && options.provider.length > 0) {
    url.searchParams.set('provider', JSON.stringify(options.provider));
  }
  if (options.page) {
    url.searchParams.set('page', '' + options.page);
  }
  if (options.pageSize) {
    url.searchParams.set('pageSize', '' + options.pageSize);
  }

  if (options.fansubId) {
    const fansubId = options.fansubId;
    const parsed = stringArray.safeParse(fansubId);
    if (parsed.success) {
      const data = parsed.data;
      if (data.length > 0) {
        if (data.length === 1) {
          url.searchParams.set('fansubId', '' + data[0]);
        } else {
          url.searchParams.set('fansubId', JSON.stringify(data));
        }
      }
    }
  }
  if (options.fansubName && options.fansubName.length > 0) {
    url.searchParams.set('fansubName', JSON.stringify(options.fansubName));
  }
  if (options.publisherId) {
    const publisherId = options.publisherId;
    const parsed = stringArray.safeParse(publisherId);
    if (parsed.success) {
      const data = parsed.data;
      if (data.length > 0) {
        if (data.length === 1) {
          url.searchParams.set('publisherId', '' + data[0]);
        } else {
          url.searchParams.set('publisherId', JSON.stringify(data));
        }
      }
    }
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
    url.searchParams.set('search', JSON.stringify(options.search));
  }
  if (options.include && options.include.length > 0) {
    url.searchParams.set('include', JSON.stringify(options.include));
  }
  if (options.exclude && options.exclude.length > 0) {
    url.searchParams.set('exclude', JSON.stringify(options.exclude));
  }

  return url;
}
