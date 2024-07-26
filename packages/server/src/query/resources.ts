import type { Context } from 'hono';
import type { Resource as DbResource } from '@animegarden/database';

import { hash } from 'ohash';
import { memoAsync } from 'memofunc';
import { prefixStorage } from 'unstorage';
import { and, eq, gte, ilike, lte, notIlike, or, desc, inArray } from 'drizzle-orm';

import { normalizeTitle, Resource, type ResolvedFilterOptions, ResourceType } from 'animegarden';
import {
  getRefreshTimestamp,
  getTeam,
  getUser,
  resources,
  teams,
  users
} from '@animegarden/database';

import { storage } from '../storage';
import { database } from '../database';
import { isNoCache } from '../utils';
import { logger as rootLogger } from '../logger';

import { searchResources } from './search';

const logger = rootLogger.forkIntegrationLogger('detail');

const resourcesStorage = prefixStorage(storage, 'resources');

export async function pruneResourcesCache() {
  await resourcesStorage.clear();
}

export async function queryResources(ctx: Context, filter: ResolvedFilterOptions) {
  if (filter.search) {
    const resp = await searchResources(filter.search.join(' '), filter);
    return {
      timestamp: resp.timestamp,
      resources: resp.resources,
      complete: resp.complete
    };
  } else {
    const resp = !isNoCache(ctx)
      ? await listResourcesFromDB(filter)
      : await listResourcesFromDB.get(filter);
    return {
      timestamp: resp.timestamp,
      resources: resp.resources,
      complete: resp.complete
    };
  }
}

const listResourcesFromDB = memoAsync(
  async (options: ResolvedFilterOptions) => {
    const timestampPromise = getRefreshTimestamp(storage);

    const {
      page,
      pageSize,
      fansubId,
      fansubName,
      publisherId,
      type,
      before,
      after,
      include,
      keywords,
      exclude
    } = options;

    const sql = database
      .select({
        id: resources.id,
        provider: resources.provider,
        providerId: resources.providerId,
        title: resources.title,
        href: resources.href,
        type: resources.type,
        magnet: resources.magnet,
        tracker: resources.tracker,
        size: resources.size,
        anitomy: resources.anitomy,
        createdAt: resources.createdAt,
        fetchedAt: resources.fetchedAt,
        publisherId: resources.publisherId,
        fansubId: resources.fansubId,
        publisherName: users.name,
        fansubName: teams.name
      })
      .from(resources)
      .leftJoin(
        users,
        and(eq(resources.provider, users.provider), eq(resources.publisherId, users.providerId))
      )
      .leftJoin(
        teams,
        and(eq(resources.provider, teams.provider), eq(resources.fansubId, teams.providerId))
      )
      .where(
        and(
          eq(resources.isDeleted, false),
          eq(resources.isDuplicated, options.duplicate),
          type ? eq(resources.type, type) : undefined,
          after ? gte(resources.createdAt, after) : undefined,
          before ? lte(resources.createdAt, before) : undefined,
          // Filter fansub
          (fansubId && fansubId.length > 0) || (fansubName && fansubName.length > 0)
            ? or(
                fansubId ? inArray(teams.providerId, fansubId) : undefined,
                fansubName ? inArray(teams.name, fansubName) : undefined
              )
            : undefined,
          // Filter publisher
          publisherId && publisherId.length > 0
            ? inArray(users.providerId, publisherId)
            : undefined,
          // Include at least one of included keywords
          include && include?.length > 0
            ? or(...include.map((t) => ilike(resources.titleAlt, `%${normalizeTitle(t)}%`)))
            : undefined,
          // Include all the keywords
          ...(keywords?.map((t) => ilike(resources.titleAlt, `%${normalizeTitle(t)}%`)) ?? []),
          // Exclude all the keywords
          ...(exclude?.map((t) => notIlike(resources.titleAlt, `%${normalizeTitle(t)}%`)) ?? [])
        )
      )
      .orderBy(desc(resources.createdAt), desc(resources.id))
      .offset((page - 1) * pageSize)
      .limit(pageSize + 1); // Used for determining whether there are rest resources

    const result = await sql;
    const timestamp = await timestampPromise;

    return {
      timestamp,
      resources: await transformFromDb(result.slice(0, pageSize)),
      complete: result.length <= pageSize
    };
  },
  {
    external: {
      async get([params]) {
        const key = hash(params);
        const [resp, timestamp] = await Promise.all([
          resourcesStorage.getItem<{ timestamp: Date; resources: Resource[]; complete: boolean }>(
            key
          ),
          getRefreshTimestamp(storage)
        ] as const);
        if (resp) {
          // Hack: due to the serialization issue, manually transform data
          resp.timestamp = new Date(resp.timestamp);
          if (resp.timestamp.getTime() === timestamp.getTime()) {
            logger.info(`Resources list cache ${key} hit (now is ${resp.timestamp})`);
            return resp;
          }
          // Cache stale
          logger.info(
            `Resources list cache ${key} stale (fetched at ${resp.timestamp}, now is ${timestamp})`
          );
          await resourcesStorage.removeItem(key);
        }
        // Cache miss
        logger.info(`Resources list cache ${key} miss (now is ${timestamp})`);
        return undefined;
      },
      async set([params], value) {
        // Cache set
        const key = hash(params);
        logger.info(`Resources list cache ${key} has been set at ${value.timestamp}`);
        return resourcesStorage.setItem(key, value, {
          // Cached 1 hour
          ttl: 60 * 60
        });
      },
      async remove([params]) {
        return resourcesStorage.removeItem(hash(params));
      },
      async clear() {}
    }
  }
);

async function transformFromDb(
  resources: Array<
    Omit<DbResource, 'titleAlt' | 'isDeleted' | 'isDuplicated'> & {
      publisherName: string | null;
      fansubName: string | null;
    }
  >
) {
  const result: Resource[] = [];
  for (const r of resources) {
    const fansubName = r.fansubName
      ? r.fansubName
      : r.fansubId
        ? (await getTeam(database, r.provider, r.fansubId))?.name
        : undefined;
    const publisherName = r.publisherName
      ? r.publisherName
      : (await getUser(database, r.provider, r.publisherId))!.name;

    const href = r.provider === 'dmhy' ? `https://share.dmhy.org/topics/view/${r.href}` : r.href;
    const fansubHref =
      r.provider === 'dmhy' && r.fansubId
        ? `https://share.dmhy.org/topics/list/team_id/${r.fansubId}`
        : undefined;
    const publisherHref =
      r.provider === 'dmhy'
        ? `https://share.dmhy.org/topics/list/user_id/${r.publisherId}`
        : undefined;

    console.log(`Resource: ${r.provider} ${r.providerId} ${r.title} ${r.createdAt} ${r.fetchedAt}`);

    result.push({
      id: r.id,
      provider: r.provider,
      providerId: r.providerId,
      title: r.title,
      href,
      type: r.type as ResourceType,
      magnet: r.magnet,
      tracker: r.tracker,
      size: r.size,
      // When reading this field from cache, it will be transfromed to string
      createdAt: new Date(r.createdAt!).toISOString(),
      fetchedAt: new Date(r.fetchedAt!).toISOString(),
      fansub: fansubName
        ? {
            id: r.fansubId,
            name: fansubName,
            // @ts-ignore
            href: fansubHref
          }
        : undefined,
      publisher: {
        id: r.publisherId,
        name: publisherName,
        // @ts-ignore
        href: publisherHref
      }
    });
  }
  return result;
  // return result.map((r) => ({
  //   id: r.id,
  //   title: r.title,
  //   href: `https://share.dmhy.org/topics/view/${r.href}`,
  //   type: r.type,
  //   magnet: r.magnet,
  //   size: r.size,
  //   // When reading this field from cache, it will be transfromed to string
  //   createdAt:
  //     typeof r.createdAt === 'string' && /^\d+$/.test(r.createdAt)
  //       ? new Date(Number(r.createdAt))
  //       : new Date(r.createdAt),
  //   fansub: r.fansubName
  //     ? {
  //         id: r.fansubId,
  //         name: r.fansubName,
  //         href: `https://share.dmhy.org/topics/list/team_id/${r.fansubId}`
  //       }
  //     : undefined,
  //   publisher: {
  //     id: r.publisherId,
  //     name: r.publisherName!,
  //     href: `https://share.dmhy.org/topics/list/user_id/${r.publisherId}`
  //   }
  // }));
}
