import type { Context } from 'hono';

import { prefixStorage } from 'unstorage';

import { fetchANiDetail } from '@animegarden/scraper';

import { storage } from '../storage';
import { logger as rootLogger } from '../logger';

const logger = rootLogger.forkIntegrationLogger('ani-detail');

const aniDetailStorage = prefixStorage(storage, 'ani-detail');

export async function getANiResourceDetail(ctx: Context) {
  const id = ctx.req.param('href');

  const cache = await aniDetailStorage.getItem(id);
  if (!!cache) {
    logger.info(`Resouce detail ${id} hit cache`);
    return ctx.json({ id, detail: cache });
  }

  logger.info(`Resouce detail ${id} cache miss`);

  logger.info(`Try fetching ani detail of ${id}`);

  const resp = await fetchANiDetail(fetch, id);
  if (!resp) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  logger.info(`Set resouce detail ${id} cache`);

  const detail = { ...resp, id };
  await aniDetailStorage.setItem(id, detail, { ttl: 60 * 60 * 24 * 7 }).catch(() => {});

  return ctx.json({ id, detail });
}
