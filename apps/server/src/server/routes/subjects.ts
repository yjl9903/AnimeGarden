import { defineHandler } from '../utils/hono.ts';
import { safeEtag as etag } from '../utils/etag.ts';
import { paginateMetadataList } from '../utils/metadata-pagination.ts';

export const defineSubjectsRoutes = defineHandler((sys, app) =>
  app.get('/subjects', etag(), (c) => {
    c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
    const { result: subjects, pagination } = paginateMetadataList(
      sys.modules.subjects.activeSubjects,
      new URL(c.req.url).searchParams
    );
    return c.json({
      status: 'OK',
      subjects,
      ...(pagination ? { pagination } : {})
    });
  })
);
