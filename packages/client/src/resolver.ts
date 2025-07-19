import { z } from 'zod';

import type {
  PaginationOptions,
  FilterOptions,
  PresetOptions,
  ResolvedFilterOptions,
  ResolvedPaginationOptions
} from './types';

import { DefaultPageSize, MaxRequestPageSize, SupportPresets, SupportProviders } from './constants';

const dateLike = z.union([
  z.null(),
  z.undefined(),
  z.coerce.number().transform((n) => new Date(n)),
  z.coerce.date()
]);

const stringArray = z.union([z.string().transform((s) => [s]), z.array(z.string())]);

const providerEnum = z.enum(SupportProviders);

const presetEnum = z.enum(SupportPresets);

const UrlSearchSchema = {
  provider: providerEnum.optional(),
  duplicate: z.union([z.null(), z.undefined(), z.coerce.boolean()]).optional(),
  page: z.union([z.null(), z.undefined(), z.coerce.number()]).optional(),
  pageSize: z.union([z.null(), z.undefined(), z.coerce.number()]).optional(),
  fansub: z.string().array().optional(),
  publisher: z.string().array().optional(),
  type: z.string().array().optional(),
  before: dateLike.optional(),
  after: dateLike.optional(),
  subject: z.coerce.number().array().optional(),
  search: z.string().array().optional(),
  include: z.string().array().optional(),
  keyword: z.string().array().optional(),
  exclude: z.string().array().optional(),
  preset: presetEnum.optional()
};

const BodySchema = {
  provider: providerEnum.optional(),
  duplicate: z.union([z.null(), z.undefined(), z.coerce.boolean()]).optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  fansub: z.string().optional(),
  fansubs: z.string().array().optional(),
  publisher: z.string().optional(),
  publishers: z.string().array().optional(),
  type: z.string().optional(),
  types: z.string().array().optional(),
  before: dateLike.optional(),
  after: dateLike.optional(),
  subject: z.coerce.number().optional(),
  subjects: z.coerce.number().array().optional(),
  search: stringArray.optional(),
  include: stringArray.optional(),
  keywords: stringArray.optional(),
  exclude: stringArray.optional(),
  preset: presetEnum.optional()
};

export function parseURLSearch(
  params?: URLSearchParams,
  body?: PaginationOptions & FilterOptions & PresetOptions
) {
  const res1 = params
    ? {
        provider: UrlSearchSchema.provider.safeParse(params.get('provider')).data,
        duplicate: UrlSearchSchema.duplicate.safeParse(params.get('duplicate')).data,
        page: UrlSearchSchema.page.safeParse(params.get('page')).data,
        pageSize: UrlSearchSchema.pageSize.safeParse(params.get('pageSize')).data,
        fansub: UrlSearchSchema.fansub.safeParse(params.getAll('fansub')).data,
        publisher: UrlSearchSchema.publisher.safeParse(params.getAll('publisher')).data,
        type: UrlSearchSchema.type.safeParse(params.getAll('type')).data,
        before: UrlSearchSchema.before.safeParse(params.get('before')).data,
        after: UrlSearchSchema.after.safeParse(params.get('after')).data,
        subject: UrlSearchSchema.subject.safeParse(params.getAll('subject')).data,
        search: UrlSearchSchema.search.safeParse(params.getAll('search')).data,
        include: UrlSearchSchema.include.safeParse(params.getAll('include')).data,
        keyword: UrlSearchSchema.keyword.safeParse(params.getAll('keyword')).data,
        exclude: UrlSearchSchema.exclude.safeParse(params.getAll('exclude')).data,
        preset: UrlSearchSchema.preset.safeParse(params.get('preset')).data
      }
    : undefined;

  const res2 = body
    ? {
        provider: BodySchema.provider.safeParse(body.provider).data,
        duplicate: BodySchema.duplicate.safeParse(body.duplicate).data,
        page: BodySchema.page.safeParse(body.page).data,
        pageSize: BodySchema.pageSize.safeParse(body.pageSize).data,
        fansub: BodySchema.fansub.safeParse(body.fansub).data,
        fansubs: BodySchema.fansubs.safeParse(body.fansubs).data,
        publisher: BodySchema.publisher.safeParse(body.publisher).data,
        publishers: BodySchema.publishers.safeParse(body.publishers).data,
        type: BodySchema.type.safeParse(body.type).data,
        types: BodySchema.types.safeParse(body.types).data,
        before: BodySchema.before.safeParse(body.before).data,
        after: BodySchema.after.safeParse(body.after).data,
        subject: BodySchema.subject.safeParse(body.subject).data,
        subjects: BodySchema.subjects.safeParse(body.subjects).data,
        search: BodySchema.search.safeParse(body.search).data,
        include: BodySchema.include.safeParse(body.include).data,
        keywords: BodySchema.keywords.safeParse(body.keywords).data,
        exclude: BodySchema.exclude.safeParse(body.exclude).data,
        preset: BodySchema.preset.safeParse(body.preset).data
      }
    : undefined;

  const pagination: ResolvedPaginationOptions = {
    page: res1?.page ?? res2?.page ?? 1,
    pageSize: res1?.pageSize ?? res2?.pageSize ?? DefaultPageSize
  };
  const filter: ResolvedFilterOptions = {};

  const isNaN = (d: unknown): boolean => d === undefined || d === null || Number.isNaN(d);

  if (isNaN(pagination.page) || pagination.page < 1) {
    pagination.page = 1;
  } else {
    pagination.page = Math.round(pagination.page);
  }

  if (
    isNaN(pagination.pageSize) ||
    pagination.pageSize < 1 ||
    pagination.pageSize > MaxRequestPageSize
  ) {
    pagination.pageSize = DefaultPageSize;
  } else {
    pagination.pageSize = Math.round(pagination.pageSize);
  }

  if (res2?.preset) {
    filter.preset = res2.preset;
  } else if (res1?.preset) {
    filter.preset = res1.preset;
  }

  if (res2?.provider) {
    filter.duplicate = res1?.duplicate ?? res2?.duplicate ?? true;
    filter.provider = res2.provider;
  } else if (res1?.provider) {
    filter.provider = res1.provider;
    filter.duplicate = res2?.duplicate ?? res1?.duplicate ?? true;
  }

  if (res2?.fansub) {
    filter.fansubs = [res2.fansub];
  } else if (res2?.fansubs && res2.fansubs.length > 0) {
    filter.fansubs = res2.fansubs;
  } else if (res1?.fansub && res1.fansub.length > 0) {
    filter.fansubs = res1.fansub;
  }
  if (filter.fansubs) {
    filter.fansubs = [...new Set(filter.fansubs)];
  }

  if (res2?.publisher) {
    filter.publishers = [res2.publisher];
  } else if (res2?.publishers && res2.publishers.length > 0) {
    filter.publishers = res2.publishers;
  } else if (res1?.publisher && res1.publisher.length > 0) {
    filter.publishers = res1.publisher;
  }

  if (res2?.type) {
    filter.types = [res2.type];
  } else if (res2?.types && res2.types.length > 0) {
    filter.types = res2.types;
  } else if (res1?.type && res1.type.length > 0) {
    filter.types = res1.type;
  }
  if (filter.types) {
    filter.types = [...new Set(filter.types)];
  }

  if (res2?.before || res1?.before) {
    filter.before = res2?.before || res1?.before || undefined;
  }
  if (res2?.after || res1?.after) {
    filter.after = res2?.after || res1?.after || undefined;
  }

  if (res2?.subject) {
    filter.subjects = [res2.subject];
  } else if (res2?.subjects && res2?.subjects.length > 0) {
    filter.subjects = res2.subjects;
  } else if (res1?.subject && res1.subject.length > 0) {
    filter.subjects = res1.subject;
  }

  if (res2?.search && res2.search.length > 0) {
    filter.search = res2.search;
  } else if (res1?.search && res1.search.length > 0) {
    filter.search = res1.search;
  }
  if (filter.search) {
    filter.search = [...new Set(filter.search)];
  }

  if (res2?.include && res2.include.length > 0) {
    filter.include = res2.include;
  } else if (res1?.include && res1.include.length > 0) {
    filter.include = res1.include;
  }
  if (filter.include) {
    filter.include = [...new Set(filter.include)];
  }

  if (res2?.keywords && res2.keywords.length > 0) {
    filter.keywords = res2.keywords;
  } else if (res1?.keyword && res1.keyword.length > 0) {
    filter.keywords = res1.keyword;
  }
  if (filter.keywords) {
    filter.keywords = [...new Set(filter.keywords)];
  }

  if (res2?.exclude && res2.exclude.length > 0) {
    filter.exclude = res2.exclude;
  } else if (res1?.exclude && res1.exclude.length > 0) {
    filter.exclude = res1.exclude;
  }
  if (filter.exclude) {
    filter.exclude = [...new Set(filter.exclude)];
  }

  if (filter.search) {
    delete filter.include;
  }

  return { pagination, filter };
}

export function stringifyURLSearch(options: PaginationOptions & FilterOptions & PresetOptions) {
  const params = new URLSearchParams();

  const { page, pageSize, duplicate, after, before, preset } = options;

  if (preset) {
    params.set('preset', preset);
  }

  if (page) {
    params.set('page', '' + page);
  }
  if (pageSize) {
    params.set('pageSize', '' + pageSize);
  }
  if (duplicate) {
    params.set('duplicate', 'true');
  }
  if (after) {
    params.set('after', '' + after.getTime());
  }
  if (before) {
    params.set('before', '' + before.getTime());
  }

  const { provider } = options;
  if (provider) {
    params.set('provider', provider);
  }

  const { search, include, keywords, exclude, subject, subjects } = options;

  // subject
  if (subject) {
    params.set('subject', '' + subject);
  } else if (subjects) {
    for (const subject of new Set(subjects)) {
      params.append('subject', '' + subject);
    }
  }

  if (search && search.length > 0) {
    // 模糊搜索模式
    for (const word of new Set(search)) {
      params.append('search', word);
    }
    for (const word of keywords ? new Set(keywords) : []) {
      params.append('keyword', word);
    }
    for (const word of exclude ? new Set(exclude) : []) {
      params.append('exclude', word);
    }
  } else if (include && include.length > 0) {
    // 标题匹配模式
    for (const word of include ? new Set(include) : []) {
      params.append('include', word);
    }
    for (const word of keywords ? new Set(keywords) : []) {
      params.append('keyword', word);
    }
    for (const word of exclude ? new Set(exclude) : []) {
      params.append('exclude', word);
    }
  } else {
    // 关键词和禁用词
    for (const word of keywords ? new Set(keywords) : []) {
      params.append('keyword', word);
    }
    for (const word of exclude ? new Set(exclude) : []) {
      params.append('exclude', word);
    }
  }

  const { type, types } = options;
  if (type) {
    params.set('type', type);
  } else if (types) {
    for (const type of new Set(types)) {
      params.append('type', type);
    }
  }

  const { fansub, fansubs } = options;
  if (fansub) {
    params.set('fansub', fansub);
  } else if (fansubs) {
    for (const fansub of new Set(fansubs)) {
      params.append('fansub', fansub);
    }
  }

  const { publisher, publishers } = options;
  if (publisher) {
    params.set('publisher', publisher);
  } else if (publishers) {
    for (const publisher of new Set(publishers)) {
      params.append('publisher', publisher);
    }
  }

  params.sort();

  return params;
}
