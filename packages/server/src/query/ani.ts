import type { Context } from 'hono';

import { prefixStorage } from 'unstorage';

import { and, eq } from 'drizzle-orm';

import type { ResourceDetail } from 'animegarden';

import { resources } from '@animegarden/database';

import { storage } from '../storage';
import { database } from '../database';
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

  const [resp] = await database
    .select()
    .from(resources)
    .where(and(eq(resources.provider, 'ani'), eq(resources.providerId, id)))
    .execute();
  if (!resp) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  logger.info(`Set resouce detail ${id} cache`);

  // TODO: replace to real logic
  // Ignore cache put error
  const detail: ResourceDetail = {
    ...resp,
    createdAt: resp.createdAt!.toISOString(),
    description: '',
    magnet: {
      user: resp.href,
      href: resp.magnet + resp.tracker,
      href2: resp.magnet,
      ddplay: '',
      files: [],
      hasMoreFiles: true
    },
    publisher: { id: '1', name: 'ANi', avatar: '' },
    fansub: { id: '1', name: 'ANi', avatar: '' },
    id
  };
  await aniDetailStorage.setItem(id, detail, { ttl: 60 * 60 * 24 * 7 }).catch(() => {});

  return ctx.json({ id, detail });
}
