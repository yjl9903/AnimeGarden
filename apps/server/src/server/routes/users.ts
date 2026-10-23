import { defineHandler } from '../utils/hono.ts';
import { safeEtag as etag } from '../utils/etag.ts';
import { paginateMetadataList } from '../utils/metadata-pagination.ts';

export const defineUsersRoutes = defineHandler((sys, app) =>
  app
    .get('/users', etag(), (c) => {
      c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
      const { result: users, pagination } = paginateMetadataList(
        [...sys.modules.users.ids.values()],
        new URL(c.req.url).searchParams
      );
      return c.json({
        status: 'OK',
        users,
        ...(pagination ? { pagination } : {})
      });
    })
    .get('/teams', etag(), (c) => {
      c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
      const { result: teams, pagination } = paginateMetadataList(
        [...sys.modules.teams.ids.values()],
        new URL(c.req.url).searchParams
      );
      return c.json({
        status: 'OK',
        teams,
        ...(pagination ? { pagination } : {})
      });
    })
);
