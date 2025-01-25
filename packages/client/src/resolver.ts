import { z } from 'zod';

import type { FilterOptions, ResolvedFilterOptions } from './filter';

import { SupportProviders } from './constants';

const dateLike = z.union([
  z.null(),
  z.undefined(),
  z.coerce.number().transform((n) => new Date(n)),
  z.coerce.date()
]);

const stringArray = z.union([z.string().transform((s) => [s]), z.array(z.string())]);

const providerEnum = z.enum(SupportProviders);

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
  exclude: z.string().array().optional()
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
  exclude: stringArray.optional()
};

export function parseURLSearch(params?: URLSearchParams, body?: FilterOptions) {
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
        exclude: UrlSearchSchema.exclude.safeParse(params.getAll('exclude')).data
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
        exclude: BodySchema.exclude.safeParse(body.exclude).data
      }
    : undefined;

  const filter: ResolvedFilterOptions = {
    page: res1?.page ?? res2?.page ?? 1,
    pageSize: res1?.pageSize ?? res2?.pageSize ?? 100
  };

  const isNaN = (d: unknown): boolean => d === undefined || d === null || Number.isNaN(d);

  if (isNaN(filter.page) || filter.page < 1) {
    filter.page = 1;
  } else {
    filter.page = Math.round(filter.page);
  }

  if (isNaN(filter.pageSize) || filter.pageSize < 1 || filter.pageSize > 1000) {
    filter.pageSize = 100;
  } else {
    filter.pageSize = Math.round(filter.pageSize);
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

  if (res2?.include && res2.include.length > 0) {
    filter.include = res2.include;
  } else if (res1?.include && res1.include.length > 0) {
    filter.include = res1.include;
  }

  if (res2?.keywords && res2.keywords.length > 0) {
    filter.keywords = res2.keywords;
  } else if (res1?.keyword && res1.keyword.length > 0) {
    filter.keywords = res1.keyword;
  }

  if (res2?.exclude && res2.exclude.length > 0) {
    filter.exclude = res2.exclude;
  } else if (res1?.exclude && res1.exclude.length > 0) {
    filter.exclude = res1.exclude;
  }

  if (filter.search) {
    delete filter.include;
    delete filter.keywords;
  }

  return filter;
}

export function stringifyURLSearch(options: FilterOptions) {
  const params = new URLSearchParams();

  const { page, pageSize, duplicate, after, before } = options;

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

  const { search, include, keywords, exclude } = options;

  if (search && search.length > 0) {
    // 模糊搜索模式
    for (const word of search) {
      params.append('search', word);
    }
    for (const word of exclude ?? []) {
      params.append('exclude', word);
    }
  } else if ((include && include.length > 0) || (keywords && keywords.length > 0)) {
    // 标题匹配模式
    for (const word of include ?? []) {
      params.append('include', word);
    }
    for (const word of keywords ?? []) {
      params.append('keyword', word);
    }
    for (const word of exclude ?? []) {
      params.append('exclude', word);
    }
  }

  const { provider } = options;
  if (provider) {
    params.set('provider', provider);
  }

  const { subject, subjects } = options;
  if (subject) {
    params.set('subject', '' + subject);
  } else if (subjects) {
    for (const subject of subjects) {
      params.append('subject', '' + subject);
    }
  }

  const { type, types } = options;
  if (type) {
    params.set('type', type);
  } else if (types) {
    for (const type of types) {
      params.append('type', type);
    }
  }

  const { fansub, fansubs } = options;
  if (fansub) {
    params.set('fansub', fansub);
  } else if (fansubs) {
    for (const fansub of fansubs) {
      params.set('fansub', fansub);
    }
  }

  const { publisher, publishers } = options;
  if (publisher) {
    params.set('publisher', publisher);
  } else if (publishers) {
    for (const publisher of publishers) {
      params.set('publisher', publisher);
    }
  }

  params.sort();

  return params;
}
