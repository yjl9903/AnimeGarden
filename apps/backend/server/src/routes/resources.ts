import { defineHandler } from '../utils/hono';

export const defineResourcesRoutes = defineHandler((sys, app) =>
  app
    .get('/resources', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/resources/', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/resources/dmhy', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/resources/moe', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/resources/ani', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/dmhy/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/moe/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
    .get('/detail/ani/:id', (c) => {
      return c.json({
        status: 'OK'
      });
    })
);
