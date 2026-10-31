import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProvidersModule } from '../src/providers/module';
import { providers } from '../src/schema/providers';
import type { System } from '../src/system';

type Provider = typeof providers.$inferSelect;
const initialTime = Date.parse('2026-07-01');
const disposables: Array<() => void> = [];

function provider(version: number, isActive = true): Provider {
  return {
    id: 'dmhy',
    name: '動漫花園',
    refreshedAt: new Date(initialTime + version * 1000),
    isActive
  };
}

/** Database snapshots are independent objects, as they are with real PostgreSQL reads. */
function createModule() {
  let rows = [provider(0)];
  const from = vi.fn(async () => rows.map((row) => ({ ...row })));
  const database = { select: vi.fn(() => ({ from })) };
  const module = new ProvidersModule(
    { database, disposables } as unknown as System,
    ProvidersModule.name
  );
  vi.spyOn(module.logger, 'info').mockImplementation(() => {});
  vi.spyOn(module.logger, 'success').mockImplementation(() => {});
  const error = vi.spyOn(module.logger, 'error').mockImplementation(() => {});
  return {
    module,
    from,
    error,
    commit: (next: Provider[]) => {
      rows = next;
    }
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  disposables.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('provider snapshot refresh', () => {
  it('polls the database every minute without Redis notifications and stops on disposal', async () => {
    const { module, from, commit } = createModule();
    await module.initialize();
    expect(module.timestamp.getTime()).toBe(initialTime);
    commit([provider(1, false), { ...provider(2), id: 'moe', name: '萌番' }]);

    await vi.advanceTimersByTimeAsync(59_999);
    expect(from).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(from).toHaveBeenCalledTimes(2);
    expect(module.timestamp.getTime()).toBe(initialTime + 2000);
    expect(module.providers.get('dmhy')?.isActive).toBe(false);
    expect(module.providers.get('moe')?.name).toBe('萌番');

    disposables.forEach((dispose) => dispose());
    await vi.advanceTimersByTimeAsync(180_000);
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('keeps immediate notification refreshes alongside polling', async () => {
    const { module, from, commit } = createModule();
    await module.initialize();
    commit([provider(1)]);
    await module.refresh();
    expect(module.timestamp.getTime()).toBe(initialTime + 1000);
    expect(from).toHaveBeenCalledTimes(2);
    commit([provider(2)]);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(module.timestamp.getTime()).toBe(initialTime + 2000);
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('retains the last complete snapshot on failure and recovers on the next poll', async () => {
    const { module, from, error, commit } = createModule();
    await module.initialize();
    const failure = new Error('statement timeout');
    from.mockRejectedValueOnce(failure);
    commit([provider(1)]);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(module.providers.get('dmhy')).toEqual(provider(0));
    expect(error).toHaveBeenCalledWith(failure);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(module.providers.get('dmhy')).toEqual(provider(1));
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('does not overlap slow polls or restart the timer after disposal during a read', async () => {
    const { module, from } = createModule();
    await module.initialize();
    let resolve!: (rows: Provider[]) => void;
    from.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      })
    );

    await vi.advanceTimersByTimeAsync(60_000);
    await vi.advanceTimersByTimeAsync(180_000);
    expect(from).toHaveBeenCalledTimes(2);
    disposables.forEach((dispose) => dispose());
    resolve([provider(1)]);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(from).toHaveBeenCalledTimes(2);
    expect(module.providers.get('dmhy')).toEqual(provider(1));
  });

  it('serializes a notification behind an in-flight poll to avoid overwriting its newer snapshot', async () => {
    const { module, from, commit } = createModule();
    await module.initialize();
    let resolve!: (rows: Provider[]) => void;
    from.mockReturnValueOnce(
      new Promise((res) => {
        resolve = res;
      })
    );
    await vi.advanceTimersByTimeAsync(60_000);
    commit([provider(2)]);
    const notification = module.refresh();
    expect(from).toHaveBeenCalledTimes(2);

    resolve([provider(1)]);
    await notification;
    expect(from).toHaveBeenCalledTimes(3);
    expect(module.providers.get('dmhy')).toEqual(provider(2));
  });
});
