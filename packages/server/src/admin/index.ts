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

    app.post(`/admin/resources/sync`, async (req) => {
      // Sync the database to the meilisearch documents
      const r = await syncDocuments();
      return req.json(r);
    });
  });
}
