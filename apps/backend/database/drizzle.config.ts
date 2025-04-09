import { defineConfig } from 'drizzle-kit';

import 'dotenv/config';

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema/'
});
