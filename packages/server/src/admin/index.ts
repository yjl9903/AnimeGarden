import { updateRefreshTimestamp } from '@animegarden/database';

import { storage } from '../storage';
import { registerApp } from '../app';

import { pruneResourcesCache } from '../query/resources';

import { syncDocuments } from './meili';
import { refreshMoeResources } from './moe';
import { fixDmhyResources, refreshDmhyResources } from './dmhy';

export function registerAdmin() {
  registerApp((app) => {
    app.delete(`/admin/resources/cache`, async (req) => {
      await pruneResourcesCache();
      await updateRefreshTimestamp(storage);
      return req.json({ ok: true });
    });

    app.post(`/admin/resources/dmhy`, async (req) => {
      const r = await refreshDmhyResources();
      if (r.count > 0) {
        await updateRefreshTimestamp(storage).catch(() => {});
      }
      return req.json(r);
    });

    app.post(`/admin/resources/dmhy/sync`, async (ctx) => {
      const pageSize = 80;
      // Page index is 1-based
      const offset = +(ctx.req.query('offset') ?? '1');
      const limit = +(ctx.req.query('limit') ?? '10');

      // Fix dmhy resources
      const logs = await fixDmhyResources(offset, offset + limit - 1);
      // Sync the database to the meilisearch documents
      const docs = await syncDocuments((offset - 1) * pageSize, limit * pageSize);

      return ctx.json({ provider: 'dmhy', logs, docs });
    });

    app.post(`/admin/resources/moe`, async (req) => {
      const r = await refreshMoeResources();
      if (r.count > 0) {
        await updateRefreshTimestamp(storage).catch(() => {});
      }
      return req.json(r);
    });
  });
}
