import { defineBuildConfig } from 'unbuild';

/**
 * Host half of the DeepSeek Harness bundle.
 *
 * The Harness Host imports this package's `.` export from Node, so `src/index.ts`
 * builds to one ESM file with the reused workspace helpers
 * (`@animegarden/client`, `@animegarden/shared`, `anipar`) inlined.
 *
 * The Client half is built by `build.config.client.ts` in a separate unbuild run:
 * Rollup splits a shared chunk when two entries import the same module, while the
 * Harness Client loader evaluates `dist/client.mjs` as one classic script, so that
 * artifact must stay a single file without top-level import statements.
 * `pnpm build` runs both configs in order, so this config cleans `dist/` and the
 * Client config only writes into it.
 */
export default defineBuildConfig({
  entries: [{ input: 'src/index', name: 'index' }],
  declaration: false,
  clean: true,
  // The two-stage build writes `dist/index.mjs` here and `dist/client.mjs` in
  // `build.config.client.ts`, so unbuild's "missing package.json files" heuristic
  // reports the other declared export as absent after this first stage.
  failOnWarn: false,
  rollup: {
    emitCJS: false,
    inlineDependencies: true
  }
});
