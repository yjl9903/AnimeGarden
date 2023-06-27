import type { Context } from 'hono';
import type { Resource, Team, User } from '@prisma/client/edge';

import { memoAsync } from 'memofunc';
import {
  parseSearchURL,
  normalizeTitle,
  fetchDmhyDetail,
  ResolvedFilterOptions
} from 'animegarden';

import type { Env } from './types';

import { makePrisma } from './prisma';
import { createTimer, isNoCache } from './util';
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

export const getSearchResources = memoAsync(
  async (env: Env, options: ResolvedFilterOptions) => {
    const prisma = makePrisma(env);

    const timer = createTimer(`Search Resources`);
    timer.start();

    const { page, pageSize, fansubId, publisherId, type, before, after, search, include, exclude } =
      options;

    const result = await prisma.resource.findMany({
      where: {
        AND: [
          {
            type,
            createdAt: {
              gte: after,
              lte: before
            },
            titleAlt: {
              search: search && search.length > 0 ? search.join(' ') : undefined
            }
          },
          {
            fansubId: {
              in: fansubId
            }
          },
          {
            publisherId: {
              in: publisherId
            }
          },
          {
            AND: include?.map((arr) => ({
              OR: arr.map((t) => ({ titleAlt: { contains: normalizeTitle(t) } }))
            }))
          }
        ],
        NOT: exclude?.map((t) => ({ titleAlt: { contains: normalizeTitle(t) } }))
      },
      skip: (page - 1) * pageSize,
      take: pageSize + 1, // Used for determining whether there are rest resources
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
          expirationTtl: 300
        });
      },
      async remove([env, params]) {
        return getResourcesStore(env).remove(JSON.stringify({ params }));
      },
      async clear() {}
    }
  }
);

async function getTimestamp(ctx: Context<{ Bindings: Env }>) {
  const timestamp = await getRefreshTimestamp(ctx.env);
  return timestamp;
}

export async function searchResources(ctx: Context<{ Bindings: Env }>) {
  const url = new URL(ctx.req.url);
  const filter = parseSearchURL(url.searchParams, await ctx.req.json().catch(() => undefined));
  if (!filter) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const timestampPromise = getTimestamp(ctx);

  const result = !isNoCache(ctx)
    ? await getSearchResources(ctx.env, filter)
    : await getSearchResources.raw(ctx.env, filter);

  const complete = result.length > filter.pageSize;
  const resources = resolveQueryResult(result.slice(0, filter.pageSize));

  return ctx.json({
    resources,
    complete,
    filter,
    timestamp: await timestampPromise
  });
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
