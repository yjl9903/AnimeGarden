import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { ANiUser, ANiTeam } from 'animegarden';

import { users } from './schema/user';
import { teams } from './schema/team';

export async function migrateDatabase(db: Parameters<typeof migrate>[0]) {
  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  await migrate(db, { migrationsFolder });

  // Insert ani user
  await db.insert(teams).values(ANiUser).onConflictDoNothing().execute();
  await db.insert(users).values(ANiTeam).onConflictDoNothing().execute();
}
