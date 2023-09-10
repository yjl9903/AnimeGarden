import type { Context } from 'hono';

import { sql } from 'kysely';
import { hash, objectHash, sha256 } from 'ohash';
import { memoAsync } from 'memofunc';
import {
  parseSearchURL,
  normalizeTitle,
  fetchDmhyDetail,
  ResolvedFilterOptions
} from 'animegarden';

import type { Env } from './types';

import { connect } from './database';
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

export const PrefetchFilter = [
  parseSearchURL(new URLSearchParams('?page=1&pageSize=80')),
  parseSearchURL(new URLSearchParams('?page=2&pageSize=80')),
  parseSearchURL(new URLSearchParams('?page=3&pageSize=80'))
];

export const findResourcesFromDB = memoAsync(
  async (env: Env, options: ResolvedFilterOptions) => {
    const timer = createTimer(`Search Resources`);
    timer.start();

    const db = connect(env);
    const timestampPromise = getRefreshTimestamp(env);

    const {
      page,
      pageSize,
      fansubId,
      fansubName,
      publisherId,
      type,
      before,
      after,
      search,
      include,
      exclude
    } = options;

    const query = db
      .selectFrom('Resource')
      .selectAll()
      .leftJoin('User', 'Resource.publisherId', 'User.id')
      .leftJoin('Team', 'Resource.fansubId', 'Team.id')
      .select('User.name as publisherName')
      .select('Team.name as fansubName')
      .where(({ and, or, not, eb }) =>
        and(
          [
            eb('Resource.isDeleted', '=', 0),
            type ? eb('Resource.type', '=', type) : undefined,
            after ? eb('Resource.createdAt', '>=', after) : undefined,
            before ? eb('Resource.createdAt', '<=', before) : undefined,
            // fansub
            (fansubId && fansubId.length > 0) || (fansubName && fansubName.length > 0)
              ? or(
                  [
                    fansubId && fansubId.length > 0 ? eb('Team.id', 'in', fansubId) : undefined,
                    fansubName && fansubName.length > 0
                      ? eb('Team.name', 'in', fansubName)
                      : undefined
                  ].filter(Boolean)
                )
              : undefined,
            // publisher
            publisherId && publisherId.length > 0
              ? or(
                  [
                    publisherId && publisherId.length > 0
                      ? eb('User.id', 'in', publisherId)
                      : undefined
                  ].filter(Boolean)
                )
              : undefined,
            // Include
            ...(include?.map((include) =>
              or(include.map((t) => eb('Resource.titleAlt', 'like', `%${normalizeTitle(t)}%`)))
            ) ?? []),
            // Exclude
            ...(exclude?.map((t) =>
              eb('Resource.titleAlt', 'not like', `%${normalizeTitle(t)}%`)
            ) ?? [])
          ].filter(Boolean)
        )
      )
      // Search
      .$if(!!search && search.length > 0, (qb) =>
        qb.where(sql`MATCH(Resource.titleAlt) AGAINST (${search!.join(' ')} IN BOOLEAN MODE)`)
      )
      .orderBy('Resource.createdAt desc')
      .offset((page - 1) * pageSize)
      .limit(pageSize + 1); // Used for determining whether there are rest resources

    const result = await query.execute();

    const timestamp = await timestampPromise;
    timer.end();

    return {
      filter: options,
      timestamp,
      resources: result
    };
  },
  {
    external: {
      async get([env, params]) {
        return getResourcesStore(env).get(hash(params));
      },
      async set([env, params], value) {
        const key = hash(params);
        console.log(`Put ${key}: ${JSON.stringify(params)}`);
        console.log(`Put ${key}: ${objectHash(params)}`);
        console.log(`Put ${key}: ${sha256(objectHash(params))}`);
        return getResourcesStore(env).put(key, value, {
          expirationTtl: 360
        });
      },
      async remove([env, params]) {
        return getResourcesStore(env).remove(hash(params));
      },
      async clear() {}
    }
  }
);

export async function searchResources(ctx: Context<{ Bindings: Env }>) {
  const url = new URL(ctx.req.url);
  const filter = parseSearchURL(url.searchParams, await ctx.req.json().catch(() => undefined));
  if (!filter) {
    return ctx.json({ message: 'Request is not valid' }, 400);
  }

  const { timestamp, resources: result } = !isNoCache(ctx)
    ? await findResourcesFromDB(ctx.env, filter)
    : await findResourcesFromDB.raw(ctx.env, filter);

  const complete = result.length <= filter.pageSize;
  const resources = resolveQueryResult(result.slice(0, filter.pageSize));

  return ctx.json({
    filter,
    complete,
    timestamp,
    resources
  });
}

function resolveQueryResult(result: Awaited<ReturnType<typeof findResourcesFromDB>>['resources']) {
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
    fansub: r.fansubName
      ? {
          id: r.fansubId,
          name: r.fansubName,
          href: `https://share.dmhy.org/topics/list/team_id/${r.fansubId}`
        }
      : undefined,
    publisher: {
      id: r.publisherId,
      name: r.publisherName!,
      href: `https://share.dmhy.org/topics/list/user_id/${r.publisherId}`
    }
  }));
}
