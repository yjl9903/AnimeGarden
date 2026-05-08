import { defineHandler } from '../utils/hono.ts';
import { safeEtag as etag } from '../utils/etag.ts';

export const defineSubjectsRoutes = defineHandler((sys, app) =>
  app.get('/subjects', etag(), (c) => {
    c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
    return c.json({
      status: 'OK',
      subjects: sys.modules.subjects.activeSubjects
    });
  })
);
