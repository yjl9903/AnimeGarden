import type { Context } from 'hono';

import { parseCollection } from '@animegarden/client';

import { safeEtag as etag } from '../utils/etag.ts';
import { defineHandler } from '../utils/hono.ts';

// Collection hashes are SHA-1 hex digests emitted by hashCollection(), so any
// path parameter outside that shape can never match a persisted collection.
const COLLECTION_HASH_PATTERN = /^[0-9a-f]{40}$/i;

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

    // A falsy result or a rejection both mean the server itself failed to
    // persist the collection, so answer with a server-side error status.
    const gen = await sys.modules.collections.generateCollection(collection).catch(() => undefined);
    if (!gen) {
      return c.json(
        {
          status: 'ERROR',
          message: `Failed generating collection`
        },
        500
      );
    }

    return c.json({
      status: 'OK',
      id: gen.id,
      hash: gen.hash,
      createdAt: gen.createdAt
    });
  }

  return app
    .post('/collection', createCollection)
    .put('/collection', createCollection)
    .get('/collection/:hash', etag(), async (c) => {
      const hsh = c.req.param('hash');

      if (!COLLECTION_HASH_PATTERN.test(hsh)) {
        c.res.headers.set('Cache-Control', 'no-store');

        return c.json(
          {
            status: 'ERROR',
            message: 'Invalid collection hash'
          } as const,
          400
        );
      }

      try {
        const result = await sys.modules.collections.getCollection(hsh);

        if (result) {
          // Match the /resources list route: results are backed by a 300s
          // module-level cache and an ETag, so a short shared cache is safe.
          c.res.headers.set('Cache-Control', 'public, max-age=300');

          return c.json({
            status: 'OK',
            ...result
          });
        } else {
          c.res.headers.set('Cache-Control', 'no-store');

          return c.json(
            {
              status: 'ERROR',
              message: `Collection not found: ${hsh}`
            } as const,
            404
          );
        }
      } catch (error) {
        sys.logger.error(error);

        c.res.headers.set('Cache-Control', 'no-store');

        return c.json(
          {
            status: 'ERROR',
            message: 'Failed querying collection result'
          } as const,
          500
        );
      }
    });
});
