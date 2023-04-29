import type { Context } from 'hono';
import type { Resource, Team, User, Anitomy } from '@prisma/client';

import { fetchDmhyDetail } from 'animegarden';

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

export async function queryResources(ctx: Context<{ Bindings: Env }>) {
  const prisma = makePrisma(ctx.env);

  const params = resolveQueryParams(ctx.req.queries());
  if (!params) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const { page, pageSize, fansub, publisher, type, before, after } = params;
  const result = await prisma.resource.findMany({
    where: {
      type,
      fansubId: fansub,
      publisherId: publisher,
      createdAt: {
        gte: after?.getTime(),
        lte: before?.getTime()
      }
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      fansub: true,
      publisher: true,
      anitomy: true
    }
  });
  const resources = resolveQueryResult(result);
  return ctx.json({ resources, timestamp: await getRefreshTimestamp(ctx.env) });
}

export async function searchResources(ctx: Context<{ Bindings: Env }>) {
  const prisma = makePrisma(ctx.env);

  const params = resolveQueryParams(ctx.req.queries());
  if (!params) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const { page, pageSize, fansub, publisher, type, before, after } = params;
  const { keywords } = await resolveBody(ctx);
  const result = await prisma.resource.findMany({
    where: {
      AND: [
        {
          type,
          fansubId: fansub,
          publisherId: publisher,
          createdAt: {
            gte: after?.getTime(),
            lte: before?.getTime()
          }
        },
        {
          AND: keywords.include.map((arr) => ({ OR: arr.map((t) => ({ title: { contains: t } })) }))
        }
      ],
      NOT: keywords.exclude.map((t) => ({ title: { contains: t } }))
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      fansub: true,
      publisher: true,
      anitomy: true
    }
  });
  const resources = resolveQueryResult(result);
  return ctx.json({ resources, timestamp: await getRefreshTimestamp(ctx.env) });

  async function resolveBody(ctx: Context) {
    try {
      const body = await ctx.req.json<{ include: unknown; exclude: unknown }>();
      return {
        keywords: {
          include: getStringArrayArray(body.include),
          exclude: getStringArray(body.exclude)
        }
      };
    } catch (error) {
      return {
        keywords: {
          include: [],
          exclude: []
        }
      };
    }

    function getStringArrayArray(arr: unknown): string[][] {
      if (Array.isArray(arr)) {
        return arr.map((x) => getStringArray(x)).filter((x) => x.length > 0);
      } else if (typeof arr === 'string') {
        const t = arr.trim();
        return !!t ? [[t]] : [];
      } else {
        return [];
      }
    }

    function getStringArray(arr: unknown): string[] {
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

function resolveQueryParams(
  query: Record<string, string | string[] | undefined>
): QueryParams | undefined {
  let page = readNum(query.page || '1');
  let pageSize = readNum(query.count || '100');
  const fansub = query.fansub ? readNum(query.fansub) : undefined;
  const publisher = query.publisher ? readNum(query.publisher) : undefined;
  const type = typeof query.type === 'string' ? query.type : undefined;

  if (!page || !pageSize) return undefined;
  if (page <= 0) page = 1;
  if (pageSize <= 0) pageSize = 100;
  if (pageSize > 100) pageSize = 100;

  const before = readDate(query.before);
  const after = readDate(query.after);

  return { page, pageSize, fansub, publisher, type, before, after };

  function readNum(raw: string | string[]) {
    if (typeof raw === 'string' && /^\d+$/.test(raw)) {
      return +raw;
    } else {
      return undefined;
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

function resolveQueryResult(
  result: (Resource & { fansub: Team | null; publisher: User; anitomy: Anitomy | null })[]
) {
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
