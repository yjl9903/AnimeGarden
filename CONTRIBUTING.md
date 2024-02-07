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

Start dev postgres, meilisearch and redis with `docker-compose.yml`

```bash
docker compose --file=docker-compose.dev.yml up
```

Then migrate the dev postgres database and meilisearch.

```bash
pnpm animegarden db migrate --uri "postgres://root:example@0.0.0.0:5432/animegarden"
pnpm animegarden meili migrate --meili-url "http://0.0.0.0:7700" --meili-key "example"
```

Then insert the data to the database.

```bash
pnpm animegarden db insert dmhy output/dmhy \
  --uri "postgres://root:example@0.0.0.0:5432/animegarden" \
  --meili-url "http://0.0.0.0:7700" --meili-key "example"
```
