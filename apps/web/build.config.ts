import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['node/index'],
  outDir: 'node-dist',
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true
  }
});
