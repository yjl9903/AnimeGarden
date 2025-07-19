import { etag } from 'hono/etag';

import { defineHandler } from '../utils/hono';

export const defineUsersRoutes = defineHandler((sys, app) =>
  app
    .get('/users', etag(), (c) => {
      c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
      return c.json({
        status: 'OK',
        users: [...sys.modules.users.users.values()]
      });
    })
    .get('/teams', etag(), (c) => {
      c.res.headers.set('Cache-Control', `public, max-age=${24 * 60 * 60}`);
      return c.json({
        status: 'OK',
        teams: [...sys.modules.teams.teams.values()]
      });
    })
);
