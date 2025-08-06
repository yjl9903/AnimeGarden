# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AnimeGarden is a third-party mirror and anime BT resource aggregation platform for 動漫花園 (dmhy.org). It provides an open API, RSS feeds, and a web interface for searching and accessing anime resources.

## Technology Stack

- **Monorepo**: Turbo
- **Package Manager**: pnpm
- **Runtime**: Node.js v18.16.0+
- **Languages**: TypeScript (ESM modules)
- **Web Framework**: Remix (React-based full-stack framework)
- **State Management**: Jotai (React state management)
- **Server Framework**: Hono (lightweight web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis with ioredis
- **Deployment**: Fly.io
- **Styling**: UnoCSS with Tailwind CSS

## Architecture

This is a monorepo with the following key structure:

### Apps

- **`apps/web/`** - Web frontend (Remix + React)
- **`apps/server/`** - Main API server (Hono + PostgreSQL)

### Packages

- **`packages/client/`** - TypeScript API client library
- **`packages/scraper/`** - Web scrapers for dmhy.org, moe, ani sources
- **`packages/anipar/`** - Anime title parsing utilities
- **`packages/shared/`** - Shared utilities and types

## Development Commands

### Setup

```bash
# Install dependencies
pnpm i

# Setup database (requires Docker)
docker compose --file=docker-compose.dev.yml up

# Database migration
pnpm animegarden db migrate --uri "postgres://root:example@0.0.0.0:5432/animegarden"
```

### Development

```bash
# Start all services in parallel
pnpm dev

# Start specific services
pnpm dev:web       # Web frontend
pnpm dev:server    # API server on port 8080
pnpm dev:cron      # Cron jobs

# CLI management tool
pnpm manager       # Access CLI commands
```

### Building

```bash
# Build all packages
pnpm build

# Build specific packages
pnpm build:web
pnpm build:server
```

### Testing & Quality

```bash
# Run tests
pnpm test:ci

# Type checking
pnpm typecheck

# Code formatting
pnpm format
```

## Key Concepts

### Resource Scraping

The system scrapes anime resources from multiple sources:

- **dmhy** - 動漫花園 (primary source)
- **moe** - 萌番组
- **ani** - ANi資源

### Data Pipeline

1. Scrapers fetch resource data from external sites
2. Data is parsed using `anipar` for title/episode extraction
3. Resources stored in PostgreSQL with full-text search
4. API serves filtered/paginated results
5. Web frontend provides search interface and RSS feeds

### Search Features

- Advanced filtering by fansub groups, keywords, types, and so on
- Full-text search with PostgreSQL
- Custom RSS feed generation
- Bookmark collections with shareable links

## Database Schema

Key tables managed by Drizzle ORM:

- `resources` - Main resource entries from scrapers
- `details` - Detailed resource information
- `subjects` - Anime/manga subjects from Bangumi API
- `providers` - Fansub groups and uploaders
- `collections` - User bookmark collections
- `users` - User accounts (basic)

## Important Files

### Configuration

- `turbo.json` - Turbo build configuration
- `pnpm-workspace.yaml` - pnpm workspace definition
- `docker-compose.dev.yml` - Development services
- `apps/server/drizzle/` - Database migrations

### Entry Points

- `apps/server/src/cli.ts` - Server CLI interface
- `apps/web/app/root.tsx` - Web app root component
- `packages/client/src/index.ts` - API client exports

### API Routes

- `apps/server/src/server/routes/` - API endpoint definitions
- `apps/web/app/routes/` - Web frontend routes

## Development Workflow

1. **Adding New Features**: Start with the server API in `apps/server/src/server/routes/`, then implement frontend in `apps/web/app/routes/`
2. **Database Changes**: Use Drizzle Kit to generate migrations: `pnpm drizzle:generate`
3. **API Client**: Update `packages/client/` when adding new API endpoints
4. **Scrapers**: Extend `packages/scraper/` for new data sources
5. **Testing**: Each package has its own test suite, run with `pnpm test:ci`

## Environment Variables

Required for development:

- Database: `DATABASE_URL`, `POSTGRES_URL`
- Cache: `REDIS_URL`
- External APIs: `BGMD_TOKEN` (Bangumi API)

## Deployment

- **Server**: Deployed to Fly.io using `fly.server.toml`
- **Web**: Can deploy to Fly.io (`fly.toml`) or Cloudflare Pages

## Package Dependencies

The monorepo uses workspace dependencies extensively. Key external dependencies:

- `@node-rs/jieba` for Chinese text segmentation
- `drizzle-orm` & `postgres` for database
- `hono` for API server
- `ioredis` for caching
- `@remix-run/react` for web frontend
