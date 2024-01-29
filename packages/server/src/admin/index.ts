import { registerApp } from '../app';

import { syncDocuments } from './meili';
import { fixDmhyResources, refreshDmhyResources } from './dmhy';

export function registerAdmin() {
  registerApp((app) => {
    app.post(`/admin/dmhy/resources`, async (req) => {
      const r = await refreshDmhyResources();
      return req.json(r);
    });

    app.post(`/admin/moe/resources`, async (req) => {
      // const r = await refreshDmhyResources();
      return req.json({});
    });

    app.post(`/admin/resources/sync`, async (ctx) => {
      const pageSize = 80;
      const offset = +(ctx.req.query('offset') ?? '0');
      const limit = +(ctx.req.query('limit') ?? '10');

      // Fix dmhy resources
      const logs = await fixDmhyResources(offset, offset + limit - 1);
      // Sync the database to the meilisearch documents
      const docs = await syncDocuments(offset * pageSize, limit * pageSize);

      return ctx.json({ logs, docs });
    });
  });
}
