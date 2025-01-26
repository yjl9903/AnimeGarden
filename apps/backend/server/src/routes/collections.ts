import { etag } from 'hono/etag';

import { defineHandler } from '../utils/hono';

export const defineCollectionsRoutes = defineHandler((sys, app) =>
  app
    .post('/collection', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/collection/:hash', etag(), (c) => {
      return c.json({
        status: 'OK'
      });
    })
);
