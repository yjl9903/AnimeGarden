# Contribution Guide

## Setup

We recommend [mise](https://mise.jdx.dev/getting-started.html) to install Node.js and pnpm.

We use [`pnpm`](https://pnpm.io/) to manage this monorepo.

Run the setup commands from the repository root:

| Steps | Command |
|-------|--------|
| 1. [Install mise](https://mise.jdx.dev/getting-started.html) and make it available on `PATH` | - |
| 2. Install the project's Node.js and pnpm versions | `mise install node pnpm` |
| 3. Install dependencies | `mise exec -- pnpm i` |

With [mise shell activation](https://mise.jdx.dev/cli/activate.html), you can run `pnpm` directly. Otherwise, prefix the commands below with `mise exec --`.

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

This package is built on TanStack Start. See the [Web architecture guide](./docs/web/architecture-overview.md).

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
pnpm manager fetch dmhy --out-dir output --start 1 --end 2
pnpm manager fetch moe --out-dir output --start 1 --end 2
```

These commands fetch the first page from each provider and write JSON files to `output/dmhy` and `output/moe`.

Use `--start <page>` (inclusive) and `--end <page>` (exclusive) to select a larger range. Without `--end`, each command fetches one page.

### Setup the database

Start development Postgres and Redis with `docker-compose.dev.yml`:

```bash
docker compose --file=docker-compose.dev.yml up
```

Set `POSTGRES_URI` to your development database connection URI, using the configuration in [docker-compose.dev.yml](./docker-compose.dev.yml), then migrate the schema:

```bash
pnpm manager migrate --postgres-uri "$POSTGRES_URI"
```

### Import initial data

Import the previously fetched JSON files into the database:

```bash
pnpm manager import resources output/dmhy --postgres-uri "$POSTGRES_URI"
pnpm manager import resources output/moe --postgres-uri "$POSTGRES_URI"
```
