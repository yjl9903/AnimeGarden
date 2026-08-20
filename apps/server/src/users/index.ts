import { eq, inArray, max } from 'drizzle-orm';
import { memoAsync } from 'memofunc';

import type { System } from '../system/system.ts';
import type { User, Team } from '../schema/index.ts';

import { Module } from '../system/module.ts';
import { users as userSchema, teams as teamSchema } from '../schema/users.ts';
import { resources as resourceSchema } from '../schema/resources.ts';

import type { UserInfo, TeamInfo } from './types.ts';

import { appendProviderAliases, normalizePartyName } from './normalize.ts';

export * from './types.ts';

const USED_AT_BATCH_SIZE = 500;

function providerIdentity(provider: string, providerId: string) {
  return `${provider}:${providerId}`;
}

export class UsersModule extends Module<System['modules']> {
  public static name = 'users';

  /** Canonical name or provider alias -> user. */
  public readonly users: Map<string, User> = new Map();

  /** Database users.id -> user. */
  public readonly ids: Map<number, User> = new Map();

  /** "provider:providerId" -> user. */
  private readonly providerIds: Map<string, User> = new Map();

  /** Database users.id -> latest resource timestamp used to select the canonical name. */
  private readonly latestUsedAt: Map<number, number> = new Map();

  /** Background task shared by cron initialization and party insertion. */
  private latestUsedAtTask?: Promise<void>;

  public async initialize() {
    this.logger.info('Initializing Users module');
    await this.fetchUsers();
    if (this.system.options.cron) {
      void this.ensureLatestUsedAt().catch((error) =>
        this.logger.error('Failed to load latest user usage', error)
      );
    }
    this.logger.success('Initialize Users module OK');
  }

  public async refresh() {
    this.logger.info('Refreshing Users module');
    await this.fetchUsers();
    this.latestUsedAtTask = undefined;
    if (this.system.options.cron) {
      void this.ensureLatestUsedAt().catch((error) =>
        this.logger.error('Failed to load latest user usage', error)
      );
    }
    this.logger.success('Refresh Users module OK');
  }

  public async fetchUsers() {
    const users = await this.database.query.users.findMany();

    this.getById.clear();
    this.users.clear();
    this.ids.clear();
    this.providerIds.clear();
    this.latestUsedAt.clear();
    for (const user of users) {
      this.indexUser(user);
    }

    return users;
  }

  /** Adds one user to the name, database-id, and provider-id caches. */
  private indexUser(user: User) {
    this.users.set(user.name, user);
    this.ids.set(user.id, user);
    for (const [provider, info] of Object.entries(user.providers ?? {})) {
      this.providerIds.set(providerIdentity(provider, info.providerId), user);
      for (const alias of info.aliases ?? []) {
        this.users.set(alias, user);
      }
    }
  }

  /** Starts the batched load once and returns the shared task. */
  private ensureLatestUsedAt() {
    this.latestUsedAtTask ??= (async () => {
      this.logger.info('Loading latest user usage');
      this.latestUsedAt.clear();
      const ids = [...this.ids.keys()];
      for (let index = 0; index < ids.length; index += USED_AT_BATCH_SIZE) {
        const batch = ids.slice(index, index + USED_AT_BATCH_SIZE);
        const latest = await this.database
          .select({ id: resourceSchema.publisherId, usedAt: max(resourceSchema.createdAt) })
          .from(resourceSchema)
          .where(inArray(resourceSchema.publisherId, batch))
          .groupBy(resourceSchema.publisherId);
        for (const row of latest) {
          if (row.usedAt) {
            this.latestUsedAt.set(row.id, new Date(row.usedAt).getTime());
          }
        }
      }
      this.logger.success('Load latest user usage OK');
    })().catch((error) => {
      this.latestUsedAtTask = undefined;
      throw error;
    });
    return this.latestUsedAtTask;
  }

  public async insertUsers(users: UserInfo[]) {
    this.logger.info(`Start inserting ${users.length} users`);
    await this.ensureLatestUsedAt();

    const insertions: Map<string, Omit<User, 'id'>> = new Map();
    const insertionProviders = new Map<string, string>();
    const updations: Map<number, User> = new Map();
    const sorted = [...users].sort((lhs, rhs) => rhs.usedAt.getTime() - lhs.usedAt.getTime());

    for (const input of sorted) {
      const rawName = input.name;
      const user = { ...input, name: normalizePartyName(input.name, 'user') };
      const providerKey = providerIdentity(user.provider, user.providerId);
      const dbUser = this.providerIds.get(providerKey) ?? this.getByName(user.name);
      if (!dbUser) {
        // Insert user
        const insertionName = insertionProviders.get(providerKey) ?? user.name;
        const insertUser = insertions.get(insertionName);
        if (!insertUser) {
          const newUser = {
            name: user.name,
            avatar: user.avatar || null,
            providers: {
              [user.provider]: {
                providerId: user.providerId,
                avatar: user.avatar || undefined,
                aliases: rawName !== user.name ? [rawName] : undefined
              }
            }
          };
          insertions.set(user.name, newUser);
          insertionProviders.set(providerKey, user.name);
        } else {
          insertUser.avatar ??= user.avatar || null;
          const info = insertUser.providers![user.provider] ?? { providerId: user.providerId };
          info.avatar ??= user.avatar || undefined;
          insertUser.providers![user.provider] = appendProviderAliases(
            info,
            insertUser.name,
            rawName,
            user.name
          );
          insertionProviders.set(providerKey, insertionName);
        }
      } else {
        // Update user
        dbUser.providers ??= {};
        const usedAt = user.usedAt.getTime();
        const oldName = dbUser.name;
        const oldAvatar = dbUser.avatar;
        const latestUsedAt = this.latestUsedAt.get(dbUser.id) ?? 0;
        const isLatest = usedAt >= latestUsedAt;
        const occupied = this.users.get(user.name);

        // A newly observed name becomes canonical only when its resource is the newest one.
        if (oldName !== user.name && isLatest && (!occupied || occupied.id === dbUser.id)) {
          this.users.delete(oldName);
          dbUser.name = user.name;
          this.users.set(dbUser.name, dbUser);
        }

        const currentInfo = dbUser.providers[user.provider];
        const info = currentInfo ?? { providerId: user.providerId };
        const oldProviderAvatar = info.avatar;
        const oldAliases = info.aliases?.join('\0');
        info.avatar = user.avatar || info.avatar;
        dbUser.avatar ??= user.avatar || null;
        dbUser.providers[user.provider] = appendProviderAliases(
          info,
          dbUser.name,
          rawName,
          user.name,
          oldName
        );

        this.latestUsedAt.set(dbUser.id, Math.max(usedAt, latestUsedAt));

        const changed =
          oldName !== dbUser.name ||
          oldAvatar !== dbUser.avatar ||
          !currentInfo ||
          oldProviderAvatar !== info.avatar ||
          oldAliases !== info.aliases?.join('\0');
        if (changed) {
          this.indexUser(dbUser);
          updations.set(dbUser.id, dbUser);
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
        this.indexUser(Object.assign(this.users.get(user.name) ?? newUser, newUser));
      }

      const updated = await Promise.all(
        [...updations.values()].map(async (u) => {
          return await tx
            .update(userSchema)
            .set({ name: u.name, avatar: u.avatar, providers: u.providers })
            .where(eq(userSchema.id, u.id))
            .returning({ id: userSchema.id, name: userSchema.name });
        })
      );

      return [...inserted, ...updated.flat()];
    });
  }

  // ---

  public getByName(name: string) {
    const normalized = normalizePartyName(name, 'user');
    return this.users.get(normalized) ?? this.users.get(name);
  }

  /** Resolves a scraped user by stable provider identity before falling back to its name. */
  public resolve(provider: string, providerId: string | undefined, name: string) {
    return (
      (providerId ? this.providerIds.get(providerIdentity(provider, providerId)) : undefined) ??
      this.getByName(name)
    );
  }

  public getById = memoAsync(async (id: number) => {
    if (this.ids.has(id)) {
      return this.ids.get(id);
    }
    const resp = await this.database.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id)
    });
    if (resp) {
      this.indexUser(resp);
    }
    return resp;
  });
}

export class TeamsModule extends Module<System['modules']> {
  public static name = 'teams';

  /** Canonical name or provider alias -> team. */
  public teams: Map<string, Team> = new Map();

  /** Database teams.id -> team. */
  public ids: Map<number, Team> = new Map();

  /** "provider:providerId" -> team. */
  private readonly providerIds: Map<string, Team> = new Map();

  /** Database teams.id -> latest resource timestamp used to select the canonical name. */
  private readonly latestUsedAt: Map<number, number> = new Map();

  /** Background task shared by cron initialization and party insertion. */
  private latestUsedAtTask?: Promise<void>;

  public async initialize() {
    this.logger.info('Initializing Teams module');
    await this.fetchTeams();
    if (this.system.options.cron) {
      void this.ensureLatestUsedAt().catch((error) =>
        this.logger.error('Failed to load latest team usage', error)
      );
    }
    this.logger.success('Initialize Teams module OK');
  }

  public async refresh() {
    this.logger.info('Refreshing Teams module');
    await this.fetchTeams();
    this.latestUsedAtTask = undefined;
    if (this.system.options.cron) {
      void this.ensureLatestUsedAt().catch((error) =>
        this.logger.error('Failed to load latest team usage', error)
      );
    }
    this.logger.success('Refresh Teams module OK');
  }

  public async fetchTeams() {
    const teams = await this.database.query.teams.findMany();

    this.getById.clear();
    this.teams.clear();
    this.ids.clear();
    this.providerIds.clear();
    this.latestUsedAt.clear();
    for (const team of teams) {
      this.indexTeam(team);
    }

    return teams;
  }

  /** Adds one team to the name, database-id, and provider-id caches. */
  private indexTeam(team: Team) {
    this.teams.set(team.name, team);
    this.ids.set(team.id, team);
    for (const [provider, info] of Object.entries(team.providers ?? {})) {
      this.providerIds.set(providerIdentity(provider, info.providerId), team);
      for (const alias of info.aliases ?? []) {
        this.teams.set(alias, team);
      }
    }
  }

  /** Starts the batched load once and returns the shared task. */
  private ensureLatestUsedAt() {
    this.latestUsedAtTask ??= (async () => {
      this.logger.info('Loading latest team usage');
      this.latestUsedAt.clear();
      const ids = [...this.ids.keys()];
      for (let index = 0; index < ids.length; index += USED_AT_BATCH_SIZE) {
        const batch = ids.slice(index, index + USED_AT_BATCH_SIZE);
        const latest = await this.database
          .select({ id: resourceSchema.fansubId, usedAt: max(resourceSchema.createdAt) })
          .from(resourceSchema)
          .where(inArray(resourceSchema.fansubId, batch))
          .groupBy(resourceSchema.fansubId);
        for (const row of latest) {
          if (row.id !== null && row.usedAt) {
            this.latestUsedAt.set(row.id, new Date(row.usedAt).getTime());
          }
        }
      }
      this.logger.success('Load latest team usage OK');
    })().catch((error) => {
      this.latestUsedAtTask = undefined;
      throw error;
    });
    return this.latestUsedAtTask;
  }

  public async insertTeams(teams: TeamInfo[]) {
    this.logger.info(`Start inserting ${teams.length} teams`);
    await this.ensureLatestUsedAt();

    const insertions: Map<string, Omit<Team, 'id'>> = new Map();
    const insertionProviders = new Map<string, string>();
    const updations: Map<number, Team> = new Map();
    const sorted = [...teams].sort((lhs, rhs) => rhs.usedAt.getTime() - lhs.usedAt.getTime());

    for (const input of sorted) {
      const rawName = input.name;
      const team = { ...input, name: normalizePartyName(input.name, 'team') };
      const providerKey = providerIdentity(team.provider, team.providerId);
      const dbTeam = this.providerIds.get(providerKey) ?? this.getByName(team.name);
      if (!dbTeam) {
        // Insert team
        const insertionName = insertionProviders.get(providerKey) ?? team.name;
        const insertTeam = insertions.get(insertionName);
        if (!insertTeam) {
          const newTeam = {
            name: team.name,
            avatar: team.avatar || null,
            providers: {
              [team.provider]: {
                providerId: team.providerId,
                avatar: team.avatar || undefined,
                aliases: rawName !== team.name ? [rawName] : undefined
              }
            }
          };
          insertions.set(team.name, newTeam);
          insertionProviders.set(providerKey, team.name);
        } else {
          insertTeam.avatar ??= team.avatar || null;
          const info = insertTeam.providers![team.provider] ?? { providerId: team.providerId };
          info.avatar ??= team.avatar || undefined;
          insertTeam.providers![team.provider] = appendProviderAliases(
            info,
            insertTeam.name,
            rawName,
            team.name
          );
          insertionProviders.set(providerKey, insertionName);
        }
      } else {
        // Update team
        dbTeam.providers ??= {};
        const usedAt = team.usedAt.getTime();
        const oldName = dbTeam.name;
        const oldAvatar = dbTeam.avatar;
        const latestUsedAt = this.latestUsedAt.get(dbTeam.id) ?? 0;
        const isLatest = usedAt >= latestUsedAt;
        const occupied = this.teams.get(team.name);

        if (oldName !== team.name && isLatest && (!occupied || occupied.id === dbTeam.id)) {
          this.teams.delete(oldName);
          dbTeam.name = team.name;
          this.teams.set(dbTeam.name, dbTeam);
        }

        const currentInfo = dbTeam.providers[team.provider];
        const info = currentInfo ?? { providerId: team.providerId };
        const oldProviderAvatar = info.avatar;
        const oldAliases = info.aliases?.join('\0');
        info.avatar = team.avatar || info.avatar;
        dbTeam.avatar ??= team.avatar || null;
        dbTeam.providers[team.provider] = appendProviderAliases(
          info,
          dbTeam.name,
          rawName,
          team.name,
          oldName
        );

        this.latestUsedAt.set(dbTeam.id, Math.max(usedAt, latestUsedAt));

        const changed =
          oldName !== dbTeam.name ||
          oldAvatar !== dbTeam.avatar ||
          !currentInfo ||
          oldProviderAvatar !== info.avatar ||
          oldAliases !== info.aliases?.join('\0');
        if (changed) {
          this.indexTeam(dbTeam);
          updations.set(dbTeam.id, dbTeam);
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
        this.indexTeam(Object.assign(this.teams.get(team.name) ?? newTeam, newTeam));
      }

      const updated = await Promise.all(
        [...updations.values()].map(async (u) => {
          return await tx
            .update(teamSchema)
            .set({ name: u.name, avatar: u.avatar, providers: u.providers })
            .where(eq(teamSchema.id, u.id))
            .returning({ id: teamSchema.id, name: teamSchema.name });
        })
      );

      return [...inserted, ...updated.flat()];
    });
  }

  // ---

  public getByName(name: string) {
    const normalized = normalizePartyName(name, 'team');
    return this.teams.get(normalized) ?? this.teams.get(name);
  }

  /** Resolves a scraped team by stable provider identity before falling back to its name. */
  public resolve(provider: string, providerId: string | undefined, name: string) {
    return (
      (providerId ? this.providerIds.get(providerIdentity(provider, providerId)) : undefined) ??
      this.getByName(name)
    );
  }

  public getById = memoAsync(async (id: number) => {
    if (this.ids.has(id)) {
      return this.ids.get(id);
    }
    const resp = await this.database.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.id, id)
    });
    if (resp) {
      this.indexTeam(resp);
      return resp;
    }
  });
}
