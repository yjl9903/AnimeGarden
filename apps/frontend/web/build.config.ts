import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['node/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true
  }
});
