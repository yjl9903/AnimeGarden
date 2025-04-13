import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  sourcemap: true,
  clean: true,
  rollup: {
    inlineDependencies: ['@animegarden/shared']
  }
});
