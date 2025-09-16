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

### API Client

API client package is located at `packages/client`.

```bash
# Build project
pnpm -C packages/client build

# Run test
pnpm -C packages/client test
```

### anipar

It is located at `packages/anipar`.

```bash
# Build project
pnpm -C packages/anipar build

# Run test
pnpm -C packages/anipar test
```

## Applications

### Web Application

It is located at `apps/web`.

This package is built on the [Remix](https://remix.run/).

```bash
# Build web app
pnpm build:web

# Start dev server
pnpm dev:web
```

### Server Application

It is located at `apps/server`.

```bash
# Build server app
pnpm build:server

# Run server app locally
pnpm dev:server
```

## Deploy your own Anime Garden

Make sure you have setup the environment.

### Fetch initial data

```bash
pnpm manager fetch dmhy --output output/dmhy
pnpm manager fetch moe  --output output/moe
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
pnpm manager db migrate --uri "postgres://root:example@0.0.0.0:5432/animegarden"
```

Work in progress...
