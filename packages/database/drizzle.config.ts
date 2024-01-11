import type { Config } from 'drizzle-kit';

import 'dotenv/config';

export default {
  schema: './src/schema/',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
} satisfies Config;
