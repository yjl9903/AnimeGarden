import { drizzle } from 'drizzle-orm/pg-proxy';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '../src/connect/database.ts';

import { LatestPartyUsage } from '../src/users/usage.ts';

/** Executes real Drizzle query generation with controlled database responses. */
function createUsage(kind: 'user' | 'team') {
  const execute = vi.fn(async (_query: string, ids: unknown[]) => ({
    rows: ids.slice(1).map((id) => [id, null])
  }));
  const database = drizzle(execute) as unknown as Database;
  return { usage: new LatestPartyUsage(database, kind), execute };
}

describe.each(['user', 'team'] as const)('%s live usage cache', (kind) => {
  it('queries only requested IDs with a correlated, indexed live-resource limit', async () => {
    const { usage, execute } = createUsage(kind);
    await usage.ensure([31, 31, 42]);

    expect(execute).toHaveBeenCalledTimes(1);
    const [rawQuery, ids] = execute.mock.calls[0];
    const query = rawQuery.replace(/\s+/g, ' ');
    const column = kind === 'user' ? 'publisher_id' : 'fansub_id';
    const table = kind === 'user' ? 'users' : 'teams';
    expect(ids).toEqual([1, 31, 42]);
    expect(query).toContain(`"resources"."${column}" = "${table}"."id"`);
    expect(query).toContain('"resources"."is_deleted" = false');
    expect(query).toContain('"resources"."duplicated_id" is null');
    expect(query).toContain(`"resources"."${column}" is not null`);
    expect(query).toContain('order by "resources"."created_at" desc limit $1');
    expect(query).not.toMatch(/GROUP BY|MAX\(/i);
  });

  it('skips empty inputs and caches parties without live resources', async () => {
    const { usage, execute } = createUsage(kind);
    await usage.ensure([]);
    expect(execute).not.toHaveBeenCalled();
    await usage.ensure([31]);
    await usage.ensure([31]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(usage.get(31)).toBe(0);
  });

  it('shares overlapping concurrent loads without querying an ID twice', async () => {
    const { usage, execute } = createUsage(kind);
    await Promise.all([usage.ensure([31, 42]), usage.ensure([42, 53])]);
    expect(execute.mock.calls.map(([, ids]) => ids.slice(1))).toEqual([[31, 42], [53]]);
  });

  it('retries failed loads without discarding successful cached IDs', async () => {
    const { usage, execute } = createUsage(kind);
    await usage.ensure([31]);
    execute.mockRejectedValueOnce(new Error('statement timeout'));
    await expect(usage.ensure([31, 42])).rejects.toMatchObject({
      cause: { message: 'statement timeout' }
    });
    expect(usage.get(42)).toBeUndefined();
    await usage.ensure([31, 42]);
    expect(execute.mock.calls.map(([, ids]) => ids.slice(1))).toEqual([[31], [42], [42]]);
  });

  it('discards in-flight results from before a refresh and reloads the IDs', async () => {
    const { usage, execute } = createUsage(kind);
    const pending = Promise.withResolvers<{ rows: unknown[][] }>();
    execute.mockImplementationOnce(() => pending.promise);
    const loading = usage.ensure([31]);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    usage.clear();
    await usage.ensure([31]);
    pending.resolve({ rows: [[31, '2026-10-30T00:00:00Z']] });
    await loading;
    expect(usage.get(31)).toBe(0);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not let a query overwrite a newer observed resource timestamp', async () => {
    const { usage, execute } = createUsage(kind);
    const pending = Promise.withResolvers<{ rows: unknown[][] }>();
    execute.mockImplementationOnce(() => pending.promise);
    const loading = usage.ensure([31]);
    const newer = new Date('2026-10-31T00:00:00Z').getTime();
    usage.observe(31, newer);
    pending.resolve({ rows: [[31, '2026-10-30T00:00:00Z']] });
    await loading;
    expect(usage.get(31)).toBe(newer);
    usage.clear();
    await usage.ensure([31]);
    expect(usage.get(31)).toBe(0);
  });

  it('bounds each batch to 500 requested IDs', async () => {
    const { usage, execute } = createUsage(kind);
    await usage.ensure(Array.from({ length: 501 }, (_, index) => index + 1));
    expect(execute.mock.calls.map(([, ids]) => ids.length - 1)).toEqual([500, 1]);
  });
});
