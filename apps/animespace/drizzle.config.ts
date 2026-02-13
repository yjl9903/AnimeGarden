import { defineConfig } from 'drizzle-kit';

import 'dotenv/config';

export default defineConfig({
  dialect: 'sqlite',
  out: './drizzle',
  schema: './src/sqlite/'
});
