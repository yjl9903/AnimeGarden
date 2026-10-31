import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import type { Database } from '../connect/database.ts';

import { resources } from '../schema/resources.ts';
import { users, teams } from '../schema/users.ts';

const USED_AT_BATCH_SIZE = 500;

/** On-demand live-resource timestamps, shared by concurrent writes until the next refresh. */
export class LatestPartyUsage {
  private values = new Map<number, number>();
  private tasks = new Map<number, Promise<void>>();

  public constructor(
    private readonly database: Database,
    private readonly kind: 'user' | 'team'
  ) {}

  /** Reads a loaded timestamp or one observed during this process's writes. */
  public get(id: number) {
    return this.values.get(id);
  }

  /** Keeps newer incoming resource names ahead of older inputs until refresh. */
  public observe(id: number, usedAt: number) {
    this.values.set(id, Math.max(usedAt, this.values.get(id) ?? 0));
  }

  /** Invalidates cached results and prevents in-flight queries from repopulating them. */
  public clear() {
    this.values = new Map();
    this.tasks = new Map();
  }

  /** Loads only missing IDs, coalesces concurrent requests, and retries after invalidation. */
  public async ensure(ids: number[]) {
    const uniqueIds = [...new Set(ids)];
    while (true) {
      const tasks = this.tasks;
      for (let index = 0; index < uniqueIds.length; index += USED_AT_BATCH_SIZE) {
        const batch = uniqueIds.slice(index, index + USED_AT_BATCH_SIZE);
        const missing = batch.filter((id) => !this.values.has(id) && !tasks.has(id));
        if (missing.length > 0) {
          const task = this.load(missing)
            .then((rows) => {
              if (this.tasks !== tasks) return;
              // Cache empty histories too, so inactive parties do not query on every write.
              const timestamps = new Map(
                rows.map((row) => [row.id, row.usedAt ? new Date(row.usedAt).getTime() : 0])
              );
              for (const id of missing) {
                this.observe(id, timestamps.get(id) ?? 0);
              }
            })
            .finally(() => {
              for (const id of missing) tasks.delete(id);
            });
          for (const id of missing) tasks.set(id, task);
        }
        await Promise.all(batch.map((id) => tasks.get(id)));
        if (this.tasks !== tasks) break;
      }
      if (this.tasks === tasks) return;
    }
  }

  /** Uses the existing live-party indexes to stop at the newest resource for each ID. */
  private load(ids: number[]) {
    const party = this.kind === 'user' ? users : teams;
    const column = this.kind === 'user' ? resources.publisherId : resources.fansubId;
    // A nested query builder preserves qualification of the correlated outer party ID.
    const latest = this.database
      .select({ usedAt: resources.createdAt })
      .from(resources)
      .where(
        and(
          eq(column, party.id),
          // Keep this literal so prepared queries can use the partial indexes.
          sql`${resources.isDeleted} = false`,
          isNull(resources.duplicatedId),
          isNotNull(column)
        )
      )
      .orderBy(desc(resources.createdAt))
      .limit(1);

    return this.database
      .select({
        id: party.id,
        usedAt: sql<string | null>`${latest}`
      })
      .from(party)
      .where(inArray(party.id, ids));
  }
}
