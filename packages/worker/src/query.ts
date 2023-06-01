import type { Context } from 'hono';
import type { Resource, Team, User } from '@prisma/client/edge';

import { memoAsync } from 'memofunc';
import { fetchDmhyDetail } from 'animegarden';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { createTimer, isNoCache, normalizeTitle } from './util';
import { getDetailStore, getRefreshTimestamp, getResourcesStore } from './state';

export async function queryResourceDetail(ctx: Context<{ Bindings: Env }>) {
  const store = getDetailStore(ctx.env);

  const href = ctx.req.param('href');

  const cache = await store.get(href);
  if (!!cache) {
    return ctx.json({ detail: cache });
  }

  const detail = await fetchDmhyDetail(fetch, href);
  if (!detail) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  // Ignore cache put error
  await store.put(href, detail).catch(() => {});

  return ctx.json({ detail });
}

interface QueryParams {
  page: number;
  pageSize: number;
  fansub: number | undefined;
  publisher: number | undefined;
  type: string | undefined;
  before: Date | undefined;
  after: Date | undefined;
}

export const getResources = memoAsync(
  async (env: Env, params: QueryParams) => {
    const prisma = makePrisma(env);

    const timer = createTimer(`Get Resources`);
    timer.start();

    const { page, pageSize, fansub, publisher, type, before, after } = params;
    const result = await prisma.resource.findMany({
      where: {
        type,
        fansubId: fansub,
        publisherId: publisher,
        createdAt: {
          gte: after,
          lte: before
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fansub: true,
        publisher: true
      }
    });

    timer.end();
    return result;
  },
  {
    external: {
      async get([env, params]) {
        return getResourcesStore(env).get(JSON.stringify({ params }));
      },
      async set([env, params], value) {
        return getResourcesStore(env).put(JSON.stringify({ params }), value, {
          expirationTtl: 60
        });
      },
      async remove([env, params]) {
        return getResourcesStore(env).remove(JSON.stringify({ params }));
      },
      async clear() {}
    }
  }
);

export const getSearchResources = memoAsync(
  async (env: Env, params: QueryParams, input: Awaited<ReturnType<typeof resolveSearch>>) => {
    const prisma = makePrisma(env);

    const timer = createTimer(`Search Resources`);
    timer.start();

    const { page, pageSize, fansub, publisher, type, before, after } = params;
    const { search, keywords } = input;
    const result = await prisma.resource.findMany({
      where: {
        AND: [
          {
            type,
            fansubId: fansub,
            publisherId: publisher,
            createdAt: {
              gte: after,
              lte: before
            },
            titleAlt: {
              search: search.length > 0 ? search.join(' ') : undefined
            }
          },
          {
            AND: keywords.include.map((arr) => ({
              OR: arr.map((t) => ({ titleAlt: { contains: normalizeTitle(t) } }))
            }))
          }
        ],
        NOT: keywords.exclude.map((t) => ({ titleAlt: { contains: normalizeTitle(t) } }))
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fansub: true,
        publisher: true
      }
    });

    timer.end();
    return result;
  },
  {
    external: {
      async get([env, params, input]) {
        return getResourcesStore(env).get(JSON.stringify({ params, input }));
      },
      async set([env, params, input], value) {
        return getResourcesStore(env).put(JSON.stringify({ params, input }), value, {
          expirationTtl: 300
        });
      },
      async remove([env, params, input]) {
        return getResourcesStore(env).remove(JSON.stringify({ params, input }));
      },
      async clear() {}
    }
  }
);

async function getTimestamp(ctx: Context<{ Bindings: Env }>) {
  const timestamp = await getRefreshTimestamp(ctx.env);
  return timestamp;
}

export async function queryResources(ctx: Context<{ Bindings: Env }>) {
  const params = resolveQueryParams(ctx);
  if (!params) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const timestampPromise = getTimestamp(ctx);
  const result = !isNoCache(ctx)
    ? await getResources(ctx.env, params)
    : await getResources.raw(ctx.env, params);
  const resources = resolveQueryResult(result);

  return ctx.json({ resources, timestamp: await timestampPromise });
}

export async function searchResources(ctx: Context<{ Bindings: Env }>) {
  const params = resolveQueryParams(ctx);
  if (!params) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const timestampPromise = getTimestamp(ctx);
  const searchInput = await resolveSearch(ctx);

  const result =
    searchInput.keywords.include.length > 0 || searchInput.search.length > 0
      ? !isNoCache(ctx)
        ? await getSearchResources(ctx.env, params, searchInput)
        : await getSearchResources.raw(ctx.env, params, searchInput)
      : !isNoCache(ctx)
      ? await getResources(ctx.env, params)
      : await getResources.raw(ctx.env, params);

  const resources = resolveQueryResult(result);

  return ctx.json({
    resources,
    search: {
      search: searchInput.search,
      include: searchInput.keywords.include,
      exclude: searchInput.keywords.exclude
    },
    timestamp: await timestampPromise
  });
}

function resolveQueryParams(ctx: Context): QueryParams | undefined {
  let page = readNum('page', 1);
  let pageSize = readNum('count', 100);
  const fansub = readNum('fansub', undefined);
  const publisher = readNum('publisher', undefined);

  const _type = ctx.req.query('type');
  const type = typeof _type === 'string' ? _type : undefined;

  if (!page || !pageSize) return undefined;
  if (page <= 0) page = 1;
  if (pageSize <= 0) pageSize = 100;
  if (pageSize > 100) pageSize = 100;

  const before = readDate(ctx.req.query('before'));
  const after = readDate(ctx.req.query('after'));

  return { page, pageSize, fansub, publisher, type, before, after };

  function readNum(key: string, defaultValue: number | undefined) {
    const raw = ctx.req.query(key);
    if (!raw) {
      return defaultValue;
    } else if (typeof raw === 'string' && /^\d+$/.test(raw)) {
      return +raw;
    } else {
      return defaultValue;
    }
  }

  function readDate(raw: string | string[] | undefined) {
    if (typeof raw === 'string') {
      const d = /^\d+$/.test(raw) ? new Date(+raw) : new Date(raw);
      return !isNaN(d.getTime()) ? d : undefined;
    } else {
      return undefined;
    }
  }
}

async function resolveSearch(ctx: Context) {
  const body = await resolveBody();
  const search = resolveStringArray(resolveQuery('search', body.search));
  const include = resolveStringArrayArray(resolveQuery('include', body.keywords.include));
  const exclude = resolveStringArray(resolveQuery('exclude', body.keywords.exclude));

  const MIN_LEN = 4;
  const newSearch: string[] = [];
  for (const text of search) {
    const word = normalizeTitle(text)
      .replace(/^(?:\+|-)"([^"]*)"$/, '$1')
      .replace(/%2b/g, '+');
    if (word[0] === '+') {
      if (word.length - 1 < MIN_LEN) {
        include.push([word.slice(1)]);
      } else {
        newSearch.push(`+"${word.slice(1)}"`);
      }
    } else if (word[0] === '-') {
      if (word.length - 1 < MIN_LEN) {
        exclude.push(word.slice(1));
      } else {
        newSearch.push(`-"${word.slice(1)}"`);
      }
    } else {
      if (word.length < MIN_LEN) {
        include.push([word]);
      } else {
        newSearch.push(`"${word}"`);
      }
    }
  }

  return {
    search: newSearch,
    keywords: {
      include,
      exclude
    }
  };

  function resolveQuery(key: string, fallback: unknown) {
    const content = ctx.req.query(key);
    if (!content) {
      return fallback;
    } else {
      try {
        return JSON.parse(decodeURIComponent(content));
      } catch (error) {
        return fallback;
      }
    }
  }

  async function resolveBody() {
    try {
      const body = await ctx.req.json<{ search: unknown; include: unknown; exclude: unknown }>();
      return {
        search: resolveStringArray(body.search),
        keywords: {
          include: resolveStringArrayArray(body.include),
          exclude: resolveStringArray(body.exclude)
        }
      };
    } catch (error) {
      return {
        search: [],
        keywords: {
          include: [],
          exclude: []
        }
      };
    }
  }

  function resolveStringArrayArray(arr: unknown): string[][] {
    if (Array.isArray(arr)) {
      return arr.map((x) => resolveStringArray(x)).filter((x) => x.length > 0);
    } else if (typeof arr === 'string') {
      const t = arr.trim();
      return !!t ? [[t]] : [];
    } else {
      return [];
    }
  }

  function resolveStringArray(arr: unknown): string[] {
    if (Array.isArray(arr)) {
      return arr
        .filter((x) => typeof x === 'string')
        .map((x: string) => x.trim())
        .filter(Boolean);
    } else if (typeof arr === 'string') {
      const t = arr.trim();
      return !!t ? [t] : [];
    } else {
      return [];
    }
  }
}

function resolveQueryResult(result: (Resource & { fansub: Team | null; publisher: User })[]) {
  return result.map((r) => ({
    title: r.title,
    href: `https://share.dmhy.org/topics/view/${r.href}`,
    type: r.type,
    magnet: r.magnet,
    size: r.size,
    // When reading this field from cache, it will be transfromed to string
    createdAt:
      typeof r.createdAt === 'string' && /^\d+$/.test(r.createdAt)
        ? new Date(Number(r.createdAt))
        : new Date(r.createdAt),
    fansub: r.fansub
      ? {
          id: r.fansub.id,
          name: r.fansub.name,
          href: `https://share.dmhy.org/topics/list/team_id/${r.fansub.id}`
        }
      : undefined,
    publisher: {
      id: r.publisher.id,
      name: r.publisher.name,
      href: `https://share.dmhy.org/topics/list/user_id/${r.publisher.id}`
    }
  }));
}
