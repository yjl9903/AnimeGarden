import { registerApp } from '../app';

import { syncDocuments } from './meili';
import { fixDmhyResources, refreshDmhyResources } from './dmhy';

export function registerAdmin() {
  registerApp((app) => {
    app.post(`/admin/dmhy/resources`, async (req) => {
      const r = await refreshDmhyResources();
      return req.json(r);
    });

    app.post(`/admin/dmhy/resources/sync`, async (ctx) => {
      const pageSize = 80;
      // Page index is 1-based
      const offset = +(ctx.req.query('offset') ?? '1');
      const limit = +(ctx.req.query('limit') ?? '10');

      // Fix dmhy resources
      const logs = await fixDmhyResources(offset, offset + limit - 1);
      // Sync the database to the meilisearch documents
      const docs = await syncDocuments((offset - 1) * pageSize, limit * pageSize);

      return ctx.json({ logs, docs });
    });

    app.post(`/admin/moe/resources`, async (req) => {
      // const r = await refreshDmhyResources();
      return req.json({});
    });
  });
}
