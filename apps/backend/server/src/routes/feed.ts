import { etag } from 'hono/etag';

import { getRssString } from '../rss';
import { defineHandler } from '../utils/hono';

export const defineFeedRoutes = defineHandler((sys, app) =>
  app.get('/feed.xml', etag(), async (c) => {
    c.res.headers.set('Content-Type', 'application/xml');
    c.res.headers.set('Cache-Control', `public, max-age=${1 * 60 * 60}`);
    return c.text(
      await getRssString({
        title: '',
        description: '',
        site: '',
        trailingSlash: false,
        items: []
      })
    );
  })
);
