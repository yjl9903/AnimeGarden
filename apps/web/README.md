# @animegarden/web

TanStack Start frontend for AnimeGarden.

```sh
pnpm -C apps/web dev
pnpm -C apps/web build
pnpm -C apps/web start:node
```

The production Node entry is `server.mjs`. It serves Start assets/pages, `/health`, feed routes, and sitemap routes. Web intentionally returns 404 for `/api/*`; use the standalone API service instead.
