import { bearerAuth } from 'hono/bearer-auth';

import { defineHandler } from '../utils/hono';

export const defineAdminRoutes = defineHandler((sys, app) => {
  const auth = bearerAuth({ token: sys.secret });
  app.use('/admin/', auth);

  return app
    .post('/admin/resources/dmhy', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .post('/admin/resources/dmhy/sync', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .post('/admin/resources/moe', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .post('/admin/resources/moe/sync', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .post('/admin/resources/ani', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .post('/admin/resources/ani/sync', (c) => {
      return c.json({
        status: 'OK'
      });
    });
});
