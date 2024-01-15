import { registerApp } from '../app';

export function registerQuery() {
  registerApp((app) => {
    app.post(`/resources`, async (req) => {});
    app.post(`/detail`, async (req) => {});
    app.post(`/resource`, async (req) => {});

    app.post(`/dmhy/resources`, async (req) => {});
    app.post(`/dmhy/detail`, async (req) => {});
    app.post(`/dmhy/resource`, async (req) => {});

    app.post(`/moe/resources`, async (req) => {});
    app.post(`/moe/detail`, async (req) => {});
    app.post(`/moe/resource`, async (req) => {});
  });
}
