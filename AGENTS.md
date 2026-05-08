# Repository Guidelines

## Project Structure & Module Organization

AnimeGarden is a pnpm/Turborepo monorepo. Apps live in `apps/`: `apps/web` is the frontend Remix app, `apps/server` is the backend with `server` and `cron` service types, and `apps/worker` redirects historical links. Libraries live in `packages/`: `client`, `scraper`, `shared`, and `anipar`. TypeScript source is under each package's `src/` or `apps/web/app/`. Tests live in per-package `test/` directories.

## Build, Test, and Development Commands

- `pnpm i`: install workspace dependencies. Use pnpm 10.x with Node 24.
- `pnpm build`: run `turbo run build`.
- `pnpm build:web`, `pnpm build:server`, `pnpm build:worker`: build one app and dependencies.
- `pnpm dev`: start development tasks in parallel.
- `pnpm dev:web`: run the Remix dev server from `apps/web`.
- `pnpm dev:server`: start the local server CLI on port `8080`.
- `pnpm test:ci`: run the CI test pipeline through Turbo.
- `pnpm typecheck`: run workspace TypeScript checks.
- `pnpm format`: format source and test files.

## Coding Style & Naming Conventions

The repo uses TypeScript ESM and Prettier. Follow `.prettierrc.cjs`: semicolons, single quotes, `printWidth: 100`, and no trailing commas. Prefer package-scoped imports like `@animegarden/client` when available. Use descriptive filenames; tests use `*.test.ts` or `*.test.tsx`. Follow the agent's normal coding discipline first, then these project rules: add method-level and data type definition comments for exported or non-obvious behavior; comment key branches and critical steps inside methods; keep related logic close together. When splitting methods, avoid extracting low-reuse logic if it makes the main flow harder to read.

## Testing Guidelines

Vitest is the primary test runner. Add tests in the nearest `test/` directory for behavior changes, especially parser, scraper, API, and route logic. Use `pnpm -C packages/client test` or `pnpm -C apps/server test` for focused runs; run `pnpm test:ci` before broad PRs.

## Documentation Guidelines

Read `docs/` first for the index of project documentation before changing related behavior. After code changes, update or add documentation when behavior, configuration, commands, or service responsibilities change.

## Commit & Pull Request Guidelines

Recent history follows Conventional Commits with optional scopes, for example `feat(web): add tg channel link`, `fix(server): telegram push bugs`, and `chore: update deploy config`. Keep commits scoped to one concern. PRs need a summary, linked issues, test results, and screenshots for web changes. Note required env vars, migrations, or deployment steps.

## Security & Configuration Tips

Do not commit `.animegarden/`, `node_modules/`, `dist/`, build outputs, or local secrets. For local database work, use `docker-compose.dev.yml` and pass database URIs through environment variables or CLI arguments rather than hardcoding credentials.
