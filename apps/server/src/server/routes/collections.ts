import type { Context } from 'hono';

import { etag } from 'hono/etag';

import { parseCollection } from '@animegarden/client';

import { defineHandler } from '../utils/hono';

export const defineCollectionsRoutes = defineHandler((sys, app) => {
  async function createCollection(c: Context) {
    const payload = await c.req.json().catch(() => undefined);
    const collection = parseCollection(payload);
    if (!collection) {
      return c.json(
        {
          status: 'ERROR',
          message: `Incorrect collection format`
        },
        400
      );
    }

    const gen = await sys.modules.collections.generateCollection(collection);
    if (!gen) {
      return c.json(
        {
          status: 'ERROR',
          message: `Failed generating collection`
        },
        400
      );
    }

    return c.json({
      status: 'OK',
      id: gen.id,
      hash: gen.hash,
      createdAt: gen.createdAt,
      timestamp: sys.modules.providers.timestamp
    });
  }

  return app
    .post('/collection', createCollection)
    .put('/collection', createCollection)
    .get('/collection/:hash', etag(), async (c) => {
      const hsh = c.req.param('hash');
      const result = await sys.modules.collections.getCollection(hsh);

      if (result) {
        return c.json({
          status: 'OK',
          ...result,
          timestamp: sys.modules.providers.timestamp
        });
      } else {
        return c.json(
          {
            status: 'ERROR',
            message: 'Failed querying collection result',
            timestamp: sys.modules.providers.timestamp
          } as const,
          400
        );
      }
    });
});
