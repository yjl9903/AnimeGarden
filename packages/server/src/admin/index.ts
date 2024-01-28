import { registerApp } from '../app';

import { syncDocuments } from './meili';
import { refreshDmhyResources } from './dmhy';

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
      // Sync the database to the meilisearch documents
      const offset = ctx.req.query('offset') ?? '0';
      const limit = ctx.req.query('limit') ?? '1000';
      const r = await syncDocuments(+offset, +limit);
      return ctx.json(r);
    });
  });
}
