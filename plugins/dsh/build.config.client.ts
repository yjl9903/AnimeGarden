import { fileURLToPath } from 'node:url';

import { defineBuildConfig } from 'unbuild';

/**
 * Client half of the DeepSeek Harness bundle.
 *
 * The Harness Client loader materializes one self-registering factory per
 * artifact, so `src/client.ts` must bundle to a single classic script that calls
 * `window.__ModuleLoader__.load(...)`. A single entry makes Rollup inline every
 * import (including the reused `@animegarden/client` helpers and
 * `@tanstack/react-query`), leaving the file without top-level `import`/`export`
 * statements that a classic script cannot load.
 *
 * React itself is injected by the loader through `require('react')` in the
 * factory; bundled React libraries (`@tanstack/react-query`) import React
 * statically, so both React module ids are aliased to lazy shims that resolve
 * the loader-provided instance at call time.
 *
 * Bundled libraries still carry `process.env.NODE_ENV` development branches, but
 * a browser classic script has no `process` global, so those branches are
 * replaced at build time with the production value.
 *
 * `clean` stays off because `build.config.ts` (the Host build) runs first and
 * cleans `dist/`; this config only adds `dist/client.mjs`.
 */
export default defineBuildConfig({
  entries: [{ input: 'src/client', name: 'client' }],
  declaration: false,
  clean: false,
  // `dist/client.mjs` is a runtime artifact the Harness client loader fetches, not a
  // package entry point (`main`/`module`), so unbuild's "missing package.json files"
  // heuristic fires for it. The exports map declares the artifact; keep the build green.
  failOnWarn: false,
  alias: {
    // More specific id first: the jsx-runtime shim must win over the bare `react` alias.
    'react/jsx-runtime': fileURLToPath(
      new URL('./src/client/shim/react-jsx-runtime-shim.ts', import.meta.url)
    ),
    // `sonner` imports react-dom only for `flushSync`; the host already owns the renderer.
    'react-dom': fileURLToPath(new URL('./src/client/shim/react-dom-shim.ts', import.meta.url)),
    react: fileURLToPath(new URL('./src/client/shim/react-shim.ts', import.meta.url))
  },
  // The artifact runs in a browser classic script; no `process` global exists there.
  replace: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  rollup: {
    emitCJS: false,
    inlineDependencies: true,
    replace: {
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify('production')
      }
    }
  }
});
