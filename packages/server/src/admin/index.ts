import { registerApp } from '../app';

import { syncDocuments } from './meili';
import { refreshDmhyResources } from './dmhy';

export function registerAdmin() {
  registerApp((app) => {
    app.post(`/admin/dmhy/resources`, async (req) => {
      const r = await refreshDmhyResources();
      return req.json(r);
    });

    app.post(`/admin/resources/sync`, async (req) => {
      const r = await syncDocuments();
      return req.json(r);
    });
  });
}
