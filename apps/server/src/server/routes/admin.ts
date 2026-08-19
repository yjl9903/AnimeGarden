import { bearerAuth } from 'hono/bearer-auth';

import { SupportProviders } from '@animegarden/client';

import { defineHandler } from '../utils/hono.ts';

export const defineAdminRoutes = defineHandler((sys, app) => {
  const auth = bearerAuth({ token: sys.secret });
  app.use('/admin/*', auth);

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

    app.patch(`/admin/resources/${provider}/:id`, async (c) => {
      const payload = await c.req.json().catch(() => undefined);
      const subjectId = payload?.subjectId;
      const hasSubjectId = subjectId !== undefined;
      const hasDetail = payload?.detail !== undefined;
      const keys =
        payload && typeof payload === 'object' && !Array.isArray(payload)
          ? Object.keys(payload)
          : [];
      if (
        (!hasSubjectId && payload?.detail !== true) ||
        (hasSubjectId && (!Number.isInteger(subjectId) || subjectId <= 0)) ||
        (hasDetail && payload.detail !== true) ||
        keys.some((key) => key !== 'subjectId' && key !== 'detail')
      ) {
        return c.json(
          {
            status: 'ERROR',
            message: 'Expected a positive integer subjectId or detail: true.'
          } as const,
          400
        );
      }

      const providerId = c.req.param('id');
      const patch = {
        ...(hasSubjectId ? { subjectId } : {}),
        ...(payload.detail === true ? { detail: true as const } : {})
      };
      const resp = await sys.rpc.invoke('resources.patch', {
        provider,
        providerId,
        patch
      });
      if (!resp) {
        return c.json(
          {
            status: 'ERROR',
            message: 'Cron service unavailable.'
          } as const,
          503
        );
      }

      if (resp.status === 'ERROR') {
        return c.json(resp, 404);
      }

      return c.json(resp);
    });
  }

  return app;
});
