import { registerApp } from '../app';

import { refreshDmhyResources } from './dmhy';

export function registerAdmin() {
  registerApp((app) => {
    app.post(`/admin/dmhy/resources`, async (req) => {
      const r = await refreshDmhyResources();
      return req.json(r);
    });
  });
}
