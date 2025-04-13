import path from 'node:path';

import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
  alias: {
    '@animegarden/shared': path.resolve(import.meta.dirname, '../shared/src/index.ts')
  },
  rollup: {
    emitCJS: true,
    inlineDependencies: ['@animegarden/shared']
  }
});
