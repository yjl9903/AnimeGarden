# Contribution Guide

## Setup

We use [`pnpm`](https://pnpm.io/) for most of the projects to manage monorepo.

To set the repository up:

| Step | Command |
|-------|--------|
| 1. Install [Node.js](https://nodejs.org/), using the [latest LTS](https://nodejs.org/en/about/releases/) | - |
| 2. Install [pnpm](https://pnpm.io/installation) | - |
| 3. Install dependencies under the project root | `pnpm i` |

## Packages

### animegarden

Package is located at `packages/animegarden`.

```bash
# Build project
pnpm -C packages/animegarden build

# Run test
pnpm -C packages/animegarden test
```

### anitomy

Package is located at `packages/anitomy`.

```bash
# Build project
pnpm -C packages/anitomy build

# Run test
pnpm -C packages/anitomy test
```

### Web Application

Package is located at `packages/app`.

This package is built on the [Astro](https://astro.build/).

```bash
# Build app
pnpm -C packages/app build

# Start dev server
pnpm -C packages/app dev
```

### Cloudflare Worker

Package is located at `packages/worker`.

This package is based on the [Cloudflare Worker](https://developers.cloudflare.com/workers/).

It depends on:
+ [Cloudflare Worker KV Namespace](https://developers.cloudflare.com/workers/runtime-apis/kv) to cache the response data;
+ [PlanetScale](https://planetscale.com/) to store the resources list data.

```bash
# Start dev server
pnpm -C packages/worker dev

# Dry deploy
pnpm -C packages/worker build

# Deploy to the Cloudflare Worker
pnpm -C packages/worker run deploy
```

#### Setup PlanetScale

First, follow the [official quickstart guide](https://planetscale.com/docs/tutorials/planetscale-quick-start-guide) to create an empty database.

Second, do the database migration using Prisma (WIP).

Third (Optional), upload some initial data (WIP).

Last, [Generate credentials in the PlanetScale dashboard](https://planetscale.com/docs/tutorials/connect-any-application#generate-credentials-in-the-planetscale-dashboard) and create `packages/worker/.dev.vars`.

```env
DATABASE_HOST=...
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
```

