import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { System } from '../system';
import { SystemError } from '../error';

export * from './transfer';

export async function migrateDrizzle(sys: System) {
  const db = sys.database;
  const migrationsFolder = lookupMigration(fileURLToPath(new URL('../', import.meta.url)));
  await migrate(db, { migrationsFolder });
}

function lookupMigration(folder: string) {
  if (existsSync(path.join(folder, './drizzle/meta/_journal.json'))) {
    return path.join(folder, './drizzle/');
  } else {
    const parent = path.join(folder, '../');
    if (parent.length < folder.length) {
      return lookupMigration(parent)
    } else {
      throw new SystemError('Can not find migrations folder')
    }
  }
}
