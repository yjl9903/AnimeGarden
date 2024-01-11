import { migrate } from 'drizzle-orm/postgres-js/migrator';

export async function migrateDatabase(db: Parameters<typeof migrate>[0]) {
  const migrationsFolder = new URL('../drizzle', import.meta.url).pathname;
  await migrate(db, { migrationsFolder });
}
