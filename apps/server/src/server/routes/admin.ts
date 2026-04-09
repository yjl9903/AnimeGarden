import { bearerAuth } from 'hono/bearer-auth';

import { SupportProviders } from '@animegarden/client';

import { defineHandler } from '../utils/hono';

export const defineAdminRoutes = defineHandler((sys, app) => {
  const auth = bearerAuth({ token: sys.secret });
  app.use('/admin/', auth);

  app.post('/admin/providers', async (c) => {
    const resp = await sys.modules.providers.fetchProviders();
    return c.json({
      status: 'OK',
      providers: Object.fromEntries([...resp.values()].map((p) => [p.id, p]))
    } as const);
  });

  for (const provider of SupportProviders) {
    app
      .post(`/admin/resources/${provider}`, async (c) => {
        const resp = await sys.rpc.invoke('resources.fetch', { provider });
        if (!resp) {
          return c.json(
            {
              status: 'ERROR',
              message: 'Cron service unavailable.'
            } as const,
            503
          );
        }

        return c.json(resp, 202);
      })
      .post(`/admin/resources/${provider}/sync`, async (c) => {
        const start = +(c.req.query('start') ?? '1');
        const end = +(c.req.query('end') ?? '10');
        const resp = await sys.rpc.invoke('resources.sync', { provider, start, end });
        if (!resp) {
          return c.json(
            {
              status: 'ERROR',
              message: 'Cron service unavailable.'
            } as const,
            503
          );
        }

        return c.json(resp, 202);
      });
  }

  return app;
});
