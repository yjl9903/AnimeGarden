import type { Context } from 'hono';

import { and, eq } from 'drizzle-orm';
import { prefixStorage } from 'unstorage';

import { resources } from '@animegarden/database';
import { fetchDmhyDetail } from '@animegarden/scraper';

import { storage } from '../storage';
import { database } from '../database';
import { logger as rootLogger } from '../logger';

const logger = rootLogger.forkIntegrationLogger('detail');

const dmhyDetailStorage = prefixStorage(storage, 'dmhy-detail');

export async function getDmhyResourceDetail(ctx: Context) {
  const href = ctx.req.param('href');
  const id = resolveId(href);
  if (id === undefined) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  const cache = await dmhyDetailStorage.getItem('' + id);
  if (!!cache) {
    logger.info(`Resouce detail ${id} hit cache`);
    return ctx.json({ id, detail: cache });
  }

  logger.info(`Resouce detail ${id} cache miss`);

  const realHref = /^\d+$/.test(href)
    ? (
        await database
          .select({ href: resources.href })
          .from(resources)
          .where(and(eq(resources.provider, 'dmhy'), eq(resources.providerId, '' + id)))
          .execute()
      )[0]?.href
    : href;

  if (!realHref) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  logger.info(`Try fetching dmhy detail of ${realHref}`);
  const resp = await fetchDmhyDetail(fetch, realHref);
  if (!resp) {
    return ctx.json({ message: '404 NOT FOUND' }, 404);
  }

  // Set magnet href and magnet user
  await database
    .update(resources)
    .set({ magnet2: resp.magnet.href2, magnetUser: resp.magnet.user })
    .where(and(eq(resources.provider, 'dmhy'), eq(resources.providerId, resp.providerId)))
    .execute()
    .catch(() => {});

  logger.info(`Set resouce detail ${id} cache`);

  // Ignore cache put error
  const detail = { ...resp, id };
  await dmhyDetailStorage.setItem('' + id, detail, { ttl: 60 * 60 * 24 * 7 }).catch(() => {});

  return ctx.json({ id, detail });

  function resolveId(href: string) {
    const id = href.split('_')[0];
    return id && /^\d+$/.test(id) ? +id : undefined;
  }
}
