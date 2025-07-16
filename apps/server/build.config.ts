import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index', 'src/cli'],
  declaration: true,
  sourcemap: true,
  clean: true,
  rollup: {
    inlineDependencies: ['@animegarden/shared']
  }
});
