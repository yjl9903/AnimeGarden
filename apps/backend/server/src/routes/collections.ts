import { etag } from 'hono/etag';

import { parseCollection } from '@animegarden/client';

import { defineHandler } from '../utils/hono';

export const defineCollectionsRoutes = defineHandler((sys, app) =>
  app
    .post('/collection', async (c) => {
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
        hash: gen.hash
      });
    })
    .get('/collection/:hash', etag(), async (c) => {
      const hsh = c.req.param('hash');
      const result = await sys.modules.collections.getCollection(hsh);

      if (result) {
        return c.json({
          status: 'OK',
          ...result
        });
      } else {
        return c.json(
          {
            status: 'ERROR',
            message: 'Failed querying collection result'
          } as const,
          400
        );
      }
    })
);
