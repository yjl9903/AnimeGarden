import { updateRefreshTimestamp } from '@animegarden/database';

import { storage } from '../storage';
import { registerApp } from '../app';

import { pruneResourcesCache } from '../query/resources';

import { syncDocuments } from './meili';
import { fixMoeResources, refreshMoeResources } from './moe';
import { fixDmhyResources, refreshDmhyResources } from './dmhy';
import { fixANiResources, refreshANiResources } from './ani';

export function registerAdmin() {
  return registerApp((app) => {
    return app
      .delete(`/admin/resources/cache`, async (ctx) => {
        await pruneResourcesCache();
        await updateRefreshTimestamp(storage);
        return ctx.json({ ok: true });
      })
      .post(`/admin/resources/dmhy`, async (ctx) => {
        try {
          const r = await refreshDmhyResources();
          if (r.count > 0) {
            await updateRefreshTimestamp(storage).catch(() => {});
          }
          return ctx.json(r);
        } catch (error) {
          console.error(error);
          return ctx.json({ count: 0, error: (error as any)?.message });
        }
      })
      .post(`/admin/resources/dmhy/sync`, async (ctx) => {
        const pageSize = 80;
        // Page index is 1-based
        const offset = +(ctx.req.query('offset') ?? '1');
        const limit = +(ctx.req.query('limit') ?? '10');

        try {
          // Fix dmhy resources
          const logs = await fixDmhyResources(offset, offset + limit - 1);
          // Sync the database to the meilisearch documents
          const docs = await syncDocuments((offset - 1) * pageSize, limit * pageSize);

          if (logs.length > 0) {
            await updateRefreshTimestamp(storage).catch(() => {});
          }

          return ctx.json({ provider: 'dmhy', logs, docs });
        } catch (error) {
          console.error(error);
          return ctx.json({ count: 0, error: (error as any)?.message });
        }
      })
      .post(`/admin/resources/moe`, async (ctx) => {
        try {
          const r = await refreshMoeResources();
          if (r.count > 0) {
            await updateRefreshTimestamp(storage).catch(() => {});
          }
          return ctx.json(r);
        } catch (error) {
          console.error(error);
          return ctx.json({ count: 0, error: (error as any)?.message });
        }
      })
      .post(`/admin/resources/moe/sync`, async (ctx) => {
        const pageSize = 80;
        // Page index is 1-based
        const offset = +(ctx.req.query('offset') ?? '1');
        const limit = +(ctx.req.query('limit') ?? '10');

        try {
          // Fix moe resources
          const resp = await fixMoeResources(
            (offset - 1) * pageSize,
            (offset - 1) * pageSize + limit * pageSize
          );
          if (resp.logs.length > 0) {
            await updateRefreshTimestamp(storage).catch(() => {});
          }

          return ctx.json(resp);
        } catch (error) {
          console.error(error);
          return ctx.json({ count: 0, error: (error as any)?.message });
        }
      })
      .post(`/admin/resources/ani`, async (ctx) => {
        try {
          const r = await refreshANiResources();
          if (r.count > 0) {
            await updateRefreshTimestamp(storage).catch(() => {});
          }
          return ctx.json(r);
        } catch (error) {
          console.error(error);
          return ctx.json({ count: 0, error: (error as any)?.message });
        }
      })
      .post(`/admin/resources/ani/sync`, async (ctx) => {
        const pageSize = 80;
        // Page index is 1-based
        const offset = +(ctx.req.query('offset') ?? '1');
        const limit = +(ctx.req.query('limit') ?? '10');

        try {
          // Fix ani resources
          const resp = await fixANiResources(
            (offset - 1) * pageSize,
            (offset - 1) * pageSize + limit * pageSize
          );
          if (resp.logs.length > 0) {
            await updateRefreshTimestamp(storage).catch(() => {});
          }

          return ctx.json(resp);
        } catch (error) {
          console.error(error);
          return ctx.json({ count: 0, error: (error as any)?.message });
        }
      });
  });
}
