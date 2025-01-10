import type { System } from '../system';

import { connectDatabase } from '../legacy';

type LegacyDatabase = ReturnType<typeof connectDatabase>['database'];

export async function transferFromV1(sys: System, oldDatabaseName: string) {
  const oldPostgresURI = sys.options.postgresUri!.replace(/\/(\w+)$/, '/' + oldDatabaseName);
  const { connection: oldConnection, database: oldDatabase } = connectDatabase(oldPostgresURI);

  await transferUsers(sys, oldDatabase);
  await transferTeams(sys, oldDatabase);
  await transferResources(sys, oldDatabase);

  await oldConnection.end();
}

async function transferUsers(sys: System, oldDatabase: LegacyDatabase) {
  sys.logger.info('Start transfering Users');
  const users = await oldDatabase.query.users.findMany();
  const newUsers = await sys.modules.users.insertUsers(users);
  sys.logger.info(`Insert or update ${newUsers.length} new users`);
  sys.logger.success('Finish transfering Users OK');
}

async function transferTeams(sys: System, oldDatabase: LegacyDatabase) {
  sys.logger.info('Start transfering Teams');
  const teams = await oldDatabase.query.teams.findMany();
  const newTeams = await sys.modules.teams.insertTeams(teams);
  sys.logger.info(`Insert or update ${newTeams.length} new teams`);
  sys.logger.success('Finish transfering Teams OK');
}

async function transferResources(sys: System, oldDatabase: LegacyDatabase) {}
