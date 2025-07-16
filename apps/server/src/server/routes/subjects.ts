import { etag } from 'hono/etag';

import { defineHandler } from '../utils/hono';

export const defineSubjectsRoutes = defineHandler((sys, app) =>
  app.get('/subjects', etag(), (c) => {
    c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
    return c.json({
      status: 'OK',
      subjects: sys.modules.subjects.activeSubjects
    });
  })
);
