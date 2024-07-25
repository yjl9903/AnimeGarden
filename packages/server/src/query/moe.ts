import type { Context } from 'hono';

import { and, eq } from 'drizzle-orm';
import { prefixStorage } from 'unstorage';

import { resources } from '@animegarden/database';
import { fetchMoeDetail } from '@animegarden/scraper';

import { storage } from '../storage';
import { logger as rootLogger } from '../logger';

const logger = rootLogger.forkIntegrationLogger('moe-detail');

const moeDetailStorage = prefixStorage(storage, 'moe-detail');

export async function getMoeResourceDetail(ctx: Context) {
  const id = ctx.req.param('href');

  const cache = await moeDetailStorage.getItem(id);
  if (!!cache) {
    logger.info(`Resouce detail ${id} hit cache`);
    return ctx.json({ id, detail: cache });
  }

  logger.info(`Resouce detail ${id} cache miss`);

  logger.info(`Try fetching moe detail of ${id}`);
  const resp = await fetchMoeDetail(fetch, id);
  if (!resp) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  logger.info(`Set resouce detail ${id} cache`);

  // Ignore cache put error
  const detail = { ...resp, id };
  await moeDetailStorage.setItem(id, detail, { ttl: 60 * 60 * 24 * 7 }).catch(() => {});

  return ctx.json({ id, detail });
}
