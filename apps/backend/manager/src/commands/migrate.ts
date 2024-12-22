import { System, migrateDrizzle } from '@animegarden/database';

export async function migrate(sys: System) {
  return migrateDrizzle(sys);
}
