import { type Database, connectDatabase } from '@animegarden/database';

const DATABASE_URI = process.env.POSTGRES_URI ?? process.env.DATABASE_URI;
if (!DATABASE_URI) {
  console.log(`Can not find database connection string`);
  process.exit(1);
}

const conn = connectDatabase(DATABASE_URI);

export const database: Database = conn.database;
