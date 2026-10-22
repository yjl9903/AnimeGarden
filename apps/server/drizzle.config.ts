import { defineConfig } from 'drizzle-kit';

import { loadEnvironment } from './src/env.ts';

loadEnvironment();

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema/'
});
