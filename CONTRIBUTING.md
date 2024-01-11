# Contribution Guide

## Setup

We use [`pnpm`](https://pnpm.io/) to manage this monorepo.

To set the repository up:

| Steps | Command |
|-------|--------|
| 1. Install [Node.js](https://nodejs.org/), using the [latest LTS](https://nodejs.org/en/about/releases/) | - |
| 2. Install [pnpm](https://pnpm.io/installation) | `npm i -g pnpm` |
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

## Deploy your own AnimeGarden

Make sure you have setup the environment.

### Fetch initial data

```bash
pnpm animegarden fetch dmhy --output output/dmhy
pnpm animegarden fetch moe  --output output/moe
```

These two commands will fetch data from the remote and write to files in the dir `output/dmhy` and `output/moe`.

Fetching all the data usually **takes several hours**. You can use the `--from <page>` and `--to <page>` arguments to specify the fetching range.

### Setup the database

Start dev postgres and redis with `docker-compose.yml`

```bash
docker compose --file=docker-compose.dev.yml up
```

Then migrate the dev postgres database.

```bash
pnpm animegarden db migrate --uri "postgres://root:example@0.0.0.0:5432/animegarden"
```

Then insert the data to the database.

```bash
pnpm animegarden db insert dmhy output/dmhy --uri "postgres://root:example@0.0.0.0:5432/animegarden"
```
