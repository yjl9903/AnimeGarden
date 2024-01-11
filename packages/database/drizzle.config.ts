import type { Config } from 'drizzle-kit';

import 'dotenv/config';

export default {
  driver: 'pg',
  out: './drizzle',
  schema: './src/schema/'
} satisfies Config;
