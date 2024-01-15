import type { Database } from '../connection';
import type { NewTeam, NewUser, Team, User } from '../schema';

import { users } from '../schema/user';
import { teams } from '../schema/team';

const AllUsers: Map<string, Map<string, User>> = new Map();
const AllTeams: Map<string, Map<string, Team>> = new Map();

export async function insertUsers(database: Database, newUsers: NewUser[]) {
  if (AllUsers.size === 0) {
    await getAllUsers(database);
  }

  const rest = newUsers.filter((t) => !AllUsers.get(t.provider)?.get(t.providerId));
  if (rest.length === 0) return [];

  const resp = await database.insert(users).values(newUsers).onConflictDoNothing().returning({
    id: users.id,
    provider: users.provider,
    providerId: users.providerId,
    name: users.name
  });

  for (const r of resp) {
    if (!AllUsers.has(r.provider)) {
      AllUsers.set(r.provider, new Map());
    }
    const submap = AllUsers.get(r.provider)!;
    submap.set(r.providerId, r);
  }

  return resp;
}

export async function insertTeams(database: Database, newTeams: NewTeam[]) {
  if (AllTeams.size === 0) {
    await getAllTeams(database);
  }

  const rest = newTeams.filter((t) => !AllTeams.get(t.provider)?.get(t.providerId));
  if (rest.length === 0) return [];

  const resp = await database.insert(teams).values(newTeams).onConflictDoNothing().returning({
    id: teams.id,
    provider: teams.provider,
    providerId: teams.providerId,
    name: teams.name
  });

  for (const r of resp) {
    if (!AllTeams.has(r.provider)) {
      AllTeams.set(r.provider, new Map());
    }
    const submap = AllTeams.get(r.provider)!;
    submap.set(r.providerId, r);
  }

  return resp;
}

export async function getAllUsers(database: Database) {
  const resp = await database.query.users.findMany();
  for (const r of resp) {
    if (!AllUsers.has(r.provider)) {
      AllUsers.set(r.provider, new Map());
    }
    const submap = AllUsers.get(r.provider)!;
    submap.set(r.providerId, r);
  }
  return AllUsers;
}

export async function getAllTeams(database: Database) {
  const resp = await database.query.teams.findMany();
  for (const r of resp) {
    if (!AllTeams.has(r.provider)) {
      AllTeams.set(r.provider, new Map());
    }
    const submap = AllTeams.get(r.provider)!;
    submap.set(r.providerId, r);
  }
  return AllTeams;
}
