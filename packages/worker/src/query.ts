import type { Context } from 'hono';
import type { Resource, Team, User } from '@prisma/client/edge';

import { memoAsync } from 'memofunc';
import { fetchDmhyDetail } from 'animegarden';
import { tradToSimple, fullToHalf } from 'simptrad';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { getDetailStore, getRefreshTimestamp } from './state';

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
  async (prisma: ReturnType<typeof makePrisma>, params: QueryParams) => {
    const { page, pageSize, fansub, publisher, type, before, after } = params;
    const timer = createTimer(`Get Resources`);
    timer.start();
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
    serialize(_prisma, params) {
      return [
        params.page,
        params.pageSize,
        params.fansub,
        params.before,
        params.after,
        params.type,
        params.publisher
      ];
    }
  }
);

export const getSearchResources = memoAsync(
  async (
    prisma: ReturnType<typeof makePrisma>,
    params: QueryParams,
    input: Awaited<ReturnType<typeof resolveSearch>>
  ) => {
    const { page, pageSize, fansub, publisher, type, before, after } = params;
    const { search, keywords } = input;
    const timer = createTimer(`Search Resources`);
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
            }
          },
          search.length > 0
            ? {
                titleAlt: {
                  search: search.join(' ')
                }
              }
            : {
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
    serialize(_prisma, params, input) {
      return [
        params.page,
        params.pageSize,
        params.fansub,
        params.before,
        params.after,
        params.type,
        params.publisher,
        JSON.stringify([...input.keywords.include].sort()),
        JSON.stringify([...input.keywords.exclude].sort()),
        [...input.search].sort().join(' ')
      ];
    }
  }
);

// Store the timestamp to refresh cache
let cachedTimestamp: Date = new Date(0);
async function getTimestamp(ctx: Context<{ Bindings: Env }>) {
  const timestamp = await getRefreshTimestamp(ctx.env);
  if (cachedTimestamp !== timestamp) {
    cachedTimestamp = timestamp;
    getResources.clear();
    getSearchResources.clear();
  }
  return timestamp;
}

export async function queryResources(ctx: Context<{ Bindings: Env }>) {
  const prisma = makePrisma(ctx.env);

  const params = resolveQueryParams(ctx);
  if (!params) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const timestamp = await getTimestamp(ctx);
  const result = !isNoCache(ctx)
    ? await getResources(prisma, params)
    : await getResources.raw(prisma, params);
  const resources = resolveQueryResult(result);

  return ctx.json({ resources, timestamp });
}

export async function searchResources(ctx: Context<{ Bindings: Env }>) {
  const prisma = makePrisma(ctx.env);

  const params = resolveQueryParams(ctx);
  if (!params) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const timestamp = await getTimestamp(ctx);
  const searchInput = await resolveSearch(ctx);

  const result =
    searchInput.keywords.include.length > 0 || searchInput.search.length > 0
      ? !isNoCache(ctx)
        ? await getSearchResources(prisma, params, searchInput)
        : await getSearchResources.raw(prisma, params, searchInput)
      : !isNoCache(ctx)
      ? await getResources(prisma, params)
      : await getResources.raw(prisma, params);
  const resources = resolveQueryResult(result);

  return ctx.json({ resources, timestamp });
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
  const search = resolveQuery('search', body.search);
  const include = resolveQuery('include', body.keywords.include);
  const exclude = resolveQuery('exclude', body.keywords.exclude);
  return {
    search: resolveStringArray(search)
      .map(normalizeTitle)
      .map((t) => (t.startsWith('+') || t.startsWith('-') ? `${t[0]}"${t.slice(1)}"` : `"${t}"`)),
    keywords: {
      include: resolveStringArrayArray(include),
      exclude: resolveStringArray(exclude)
    }
  };

  function resolveQuery(key: string, fallback: unknown) {
    const content = ctx.req.query(key);
    if (!content) {
      return fallback;
    } else {
      try {
        return JSON.parse(content);
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
    createdAt: new Date(Number(r.createdAt)),
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

function normalizeTitle(title: string) {
  return fullToHalf(tradToSimple(title));
}

function isNoCache(ctx: Context) {
  const cacheControl = ctx.req.header('cache-control');
  const noCache = cacheControl === 'no-cache' || cacheControl === 'no-store';
  return noCache;
}

function createTimer(label: string) {
  let start = new Date();
  return {
    start() {
      start = new Date();
    },
    end() {
      const end = new Date();
      console.log(`${label}: ${((end.getTime() - start.getTime()) / 1000).toFixed(0)}ms`);
    }
  };
}
