import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@animegarden/shared': path.resolve(import.meta.dirname, '../shared/src/index.ts')
    }
  }
});
