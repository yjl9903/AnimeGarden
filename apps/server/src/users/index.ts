import { eq } from 'drizzle-orm';
import { memoAsync } from 'memofunc';

import type { System } from '../system/system';
import type { User, Team } from '../schema';

import { Module } from '../system/module';
import { users as userSchema, teams as teamSchema } from '../schema/users';

import type { UserInfo, TeamInfo } from './types';

export * from './types';

export class UsersModule extends Module<System['modules']> {
  public static name = 'users';

  public readonly users: Map<string, User> = new Map();

  public readonly ids: Map<number, User> = new Map();

  public async initialize() {
    this.logger.info('Initializing Users module');
    await this.fetchUsers();
    this.logger.success('Initialize Users module OK');
  }

  public async refresh() {
    this.logger.info('Refreshing Users module');
    await this.fetchUsers();
    this.logger.success('Refresh Users module OK');
  }

  public async fetchUsers() {
    const users = await this.database.query.users.findMany();
    this.getById.clear();
    for (const user of users) {
      if (this.users.get(user.name)) {
        const c = this.users.get(user.name)!;
        c.avatar = user.avatar;
        c.name = user.name;
        c.providers = user.providers;
      } else {
        this.users.set(user.name, user);
      }

      if (this.ids.get(user.id)) {
        const c = this.ids.get(user.id)!;
        c.avatar = user.avatar;
        c.name = user.name;
        c.providers = user.providers;
      } else {
        this.ids.set(user.id, user);
      }
    }
    return users;
  }

  public async insertUsers(users: UserInfo[]) {
    this.logger.info(`Start inserting ${users.length} users`, users);

    const dbUsers = [...this.users.values()];
    const map = new Map<string, (typeof dbUsers)[0]>();
    for (const user of dbUsers) {
      map.set(user.name, user);
    }

    const insertions: Map<string, Omit<User, 'id'>> = new Map();
    const updations: Map<string, User> = new Map();
    for (const user of users) {
      const dbUser = map.get(user.name);
      if (!dbUser) {
        // Insert user
        const insertUser = insertions.get(user.name);
        if (!insertUser) {
          const newUser = {
            name: user.name,
            avatar: user.avatar || null,
            providers: {
              [user.provider]: {
                providerId: user.providerId,
                avatar: user.avatar || undefined
              }
            }
          };
          insertions.set(user.name, newUser);
        } else {
          insertUser.avatar ??= user.avatar || null;
          insertUser.providers![user.provider] = {
            providerId: user.providerId,
            avatar: user.avatar || undefined
          };
        }
      } else {
        // Update user
        dbUser.providers ??= {};
        // 1. Update avatar
        // 2. Insert new provider
        // 3. Update exisiting provider
        if (
          !dbUser.providers[user.provider] ||
          (user.avatar && !dbUser.avatar) ||
          (user.avatar && dbUser.providers[user.provider].avatar !== user.avatar)
        ) {
          dbUser.avatar ??= user.avatar || null;
          dbUser.providers[user.provider] = {
            providerId: user.providerId,
            avatar: user.avatar || undefined
          };
          updations.set(user.name, dbUser);
        }
      }
    }

    if (insertions.size === 0 && updations.size === 0) {
      this.logger.info(`There are no changes to users`);
      return [];
    }

    this.logger.info(
      `There are ${insertions.size} users to be inserted and ${updations.size} users to be updated`
    );

    return await this.system.database.transaction(async (tx) => {
      const inserted =
        insertions.size > 0
          ? await tx
              .insert(userSchema)
              .values([...insertions.values()])
              .returning({ id: userSchema.id, name: userSchema.name })
          : [];

      for (const user of inserted) {
        const newUser = { ...insertions.get(user.name)!, ...user };
        this.users.set(user.name, Object.assign(this.users.get(user.name) ?? newUser, newUser));
        this.ids.set(user.id, Object.assign(this.ids.get(user.id) ?? newUser, newUser));
      }

      const updated = await Promise.all(
        [...updations.values()].map(async (u) => {
          return await tx
            .update(userSchema)
            .set({ avatar: u.avatar, providers: u.providers })
            .where(eq(userSchema.id, u.id))
            .returning({ id: userSchema.id, name: userSchema.name });
        })
      );

      return [...inserted, ...updated.flat()];
    });
  }

  // ---

  public getByName(name: string) {
    return this.users.get(name);
  }

  public getById = memoAsync(async (id: number) => {
    if (this.ids.has(id)) {
      return this.ids.get(id);
    }
    const resp = await this.database.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id)
    });
    if (resp) {
      this.users.set(resp.name, resp);
      this.ids.set(resp.id, resp);
    }
    return resp;
  });
}

export class TeamsModule extends Module<System['modules']> {
  public static name = 'teams';

  public teams: Map<string, Team> = new Map();

  public ids: Map<number, Team> = new Map();

  public async initialize() {
    this.logger.info('Initializing Teams module');
    await this.fetchTeams();
    this.logger.success('Initialize Teams module OK');
  }

  public async refresh() {
    this.logger.info('Refreshing Teams module');
    await this.fetchTeams();
    this.logger.success('Refresh Teams module OK');
  }

  public async fetchTeams() {
    const teams = await this.database.query.teams.findMany();
    this.getById.clear();
    for (const team of teams) {
      if (this.teams.get(team.name)) {
        const c = this.teams.get(team.name)!;
        c.avatar = team.avatar;
        c.name = team.name;
        c.providers = team.providers;
      } else {
        this.teams.set(team.name, team);
      }

      if (this.ids.get(team.id)) {
        const c = this.ids.get(team.id)!;
        c.avatar = team.avatar;
        c.name = team.name;
        c.providers = team.providers;
      } else {
        this.ids.set(team.id, team);
      }
    }
    return teams;
  }

  public async insertTeams(teams: TeamInfo[]) {
    this.logger.info(`Start inserting ${teams.length} teams`, teams);

    const dbTeams = [...this.teams.values()];
    const map = new Map<string, (typeof dbTeams)[0]>();
    for (const team of dbTeams) {
      map.set(team.name, team);
    }

    const insertions: Map<string, Omit<Team, 'id'>> = new Map();
    const updations: Map<string, Team> = new Map();
    for (const team of teams) {
      const dbTeam = map.get(team.name);
      if (!dbTeam) {
        // Insert team
        const insertTeam = insertions.get(team.name);
        if (!insertTeam) {
          const newTeam = {
            name: team.name,
            avatar: team.avatar || null,
            providers: {
              [team.provider]: {
                providerId: team.providerId,
                avatar: team.avatar || undefined
              }
            }
          };
          insertions.set(team.name, newTeam);
        } else {
          insertTeam.avatar ??= team.avatar || null;
          insertTeam.providers![team.provider] = {
            providerId: team.providerId,
            avatar: team.avatar || undefined
          };
        }
      } else {
        // Update team
        dbTeam.providers ??= {};
        // 1. Update avatar
        // 2. Insert new provider
        // 3. Update exisiting provider
        if (
          !dbTeam.providers[team.provider] ||
          (team.avatar && !dbTeam.avatar) ||
          (team.avatar && dbTeam.providers[team.provider].avatar !== team.avatar)
        ) {
          dbTeam.avatar ??= team.avatar || null;
          dbTeam.providers[team.provider] = {
            providerId: team.providerId,
            avatar: team.avatar || undefined
          };
          updations.set(team.name, dbTeam);
        }
      }
    }

    if (insertions.size === 0 && updations.size === 0) {
      this.logger.info(`There are no changes to teams`);
      return [];
    }

    this.logger.info(
      `There are ${insertions.size} teams to be inserted and ${updations.size} teams to be updated`
    );

    return await this.system.database.transaction(async (tx) => {
      const inserted =
        insertions.size > 0
          ? await tx
              .insert(teamSchema)
              .values([...insertions.values()])
              .returning({ id: teamSchema.id, name: teamSchema.name })
          : [];
      for (const team of inserted) {
        const newTeam = { ...insertions.get(team.name)!, ...team };
        this.teams.set(team.name, Object.assign(this.teams.get(team.name) ?? newTeam, newTeam));
        this.ids.set(team.id, Object.assign(this.ids.get(team.id) ?? newTeam, newTeam));
      }

      const updated = await Promise.all(
        [...updations.values()].map(async (u) => {
          return await tx
            .update(teamSchema)
            .set({ avatar: u.avatar, providers: u.providers })
            .where(eq(teamSchema.id, u.id))
            .returning({ id: teamSchema.id, name: teamSchema.name });
        })
      );

      return [...inserted, ...updated.flat()];
    });
  }

  // ---

  public getByName(name: string) {
    return this.teams.get(name);
  }

  public getById = memoAsync(async (id: number) => {
    if (this.ids.has(id)) {
      return this.ids.get(id);
    }
    const resp = await this.database.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.id, id)
    });
    if (resp) {
      this.teams.set(resp.name, resp);
      this.ids.set(resp.id, resp);
      return resp;
    }
  });
}
