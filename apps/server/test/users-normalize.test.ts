import { drizzle } from 'drizzle-orm/pg-proxy';
import { describe, expect, it, vi } from 'vitest';

import { UsersModule, TeamsModule } from '../src/users/index.ts';

import { appendProviderAliases, normalizePartyName } from '../src/users/normalize.ts';

describe('party normalization', () => {
  it('should apply only reviewed fixed corrections and boundary cleanup', () => {
    expect(normalizePartyName(' H&C推广站\u200b ', 'team')).toBe('HC推广站');
    expect(normalizePartyName('复活城&猫咪', 'team')).toBe('复活城猫咪');
    expect(normalizePartyName('梦幻旋律♪发布组', 'team')).toBe('梦幻旋律发布组');
    expect(normalizePartyName('内部 空格', 'team')).toBe('内部 空格');
  });

  it('should normalize Astral to the latest name within each party kind', () => {
    expect(normalizePartyName('Astral Union字幕组', 'team')).toBe('Astral-Union字幕组');
    expect(normalizePartyName('Astral Union', 'team')).toBe('Astral-Union字幕组');
    expect(normalizePartyName('Astral Union', 'user')).toBe('Astral-Union');
  });

  it.each(['user', 'team'] as const)('normalizes 今晚月色真美 personal releases for %s', (kind) => {
    expect(normalizePartyName('今晚月色真美个人发布', kind)).toBe('今晚月色真美');
  });

  it('should store only unique old names in provider aliases', () => {
    const info = appendProviderAliases(
      { providerId: '1', aliases: ['旧名称', '当前名称'] },
      '当前名称',
      '旧名称',
      '另一个旧名称'
    );

    expect(info).toEqual({
      providerId: '1',
      aliases: ['旧名称', '另一个旧名称']
    });
  });
});

describe.each([UsersModule, TeamsModule])('%s canonical name priority', (PartyModule) => {
  it.each([false, true])(
    'does not let aliases shadow canonical names (reverse=%s)',
    async (reverse) => {
      const rows = [
        { id: 31, name: '今晚月色真美', providers: { mikan: { providerId: '1029' } } },
        {
          id: 4738,
          name: '今晚月色真美个人发布',
          providers: { mikan: { providerId: '417', aliases: ['今晚月色真美', '旧个人发布名'] } }
        }
      ];
      if (reverse) rows.reverse();
      const query = { findMany: async () => rows };
      const module = new PartyModule(
        { database: { query: { users: query, teams: query } } } as any,
        PartyModule.name
      );
      if (module instanceof UsersModule) await module.fetchUsers();
      else await module.fetchTeams();

      expect(module.getByName('今晚月色真美')?.id).toBe(31);
      expect(module.getByName('今晚月色真美个人发布')?.id).toBe(31);
      expect(module.getByName('旧个人发布名')?.id).toBe(4738);
    }
  );
});

/** Provides real usage SQL generation and in-memory party reads/writes. */
function createPartyModule(PartyModule: typeof UsersModule | typeof TeamsModule) {
  const rows = [
    { id: 31, name: 'Current', avatar: null, providers: { dmhy: { providerId: 'stable' } } },
    { id: 42, name: 'Unrelated', avatar: null, providers: { dmhy: { providerId: 'other' } } }
  ];
  const execute = vi.fn(async (_sql: string, params: unknown[]) => ({
    rows: params.slice(1).map((id) => [id, '2026-10-20T00:00:00Z'])
  }));
  const sqlDatabase = drizzle(execute);
  const findMany = vi.fn(async () => structuredClone(rows));
  const tx = {
    insert: () => ({
      values: (values: { name: string }[]) => ({
        returning: async () => values.map(({ name }, index) => ({ id: 100 + index, name }))
      })
    }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) })
  };
  const transaction = vi.fn(async (callback) => callback(tx));
  const module = new PartyModule(
    {
      options: { cron: true },
      database: {
        select: sqlDatabase.select.bind(sqlDatabase),
        query: { users: { findMany }, teams: { findMany } },
        transaction
      }
    } as any,
    PartyModule.name
  );
  module.logger.pauseLogs();
  const insert = (inputs: Parameters<UsersModule['insertUsers']>[0]) =>
    module instanceof UsersModule ? module.insertUsers(inputs) : module.insertTeams(inputs);
  return { module, insert, execute, findMany, transaction };
}

describe.each([UsersModule, TeamsModule])('%s on-demand usage', (PartyModule) => {
  it('returns for empty writes and never prewarms usage on cron initialization or refresh', async () => {
    const { module, insert, execute, findMany, transaction } = createPartyModule(PartyModule);
    await expect(insert([])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
    await module.initialize();
    await module.refresh();
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(execute).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('loads only the resolved provider ID and protects the latest name across writes', async () => {
    const { module, insert, execute } = createPartyModule(PartyModule);
    await module.initialize();
    const input = { provider: 'dmhy', providerId: 'stable' };
    await insert([{ ...input, name: 'Old', usedAt: new Date('2026-10-19') }]);
    expect(module.ids.get(31)?.name).toBe('Current');
    expect(module.ids.get(31)?.providers?.dmhy.aliases).toContain('Old');
    await insert([{ ...input, name: 'New', usedAt: new Date('2026-10-21') }]);
    await insert([{ ...input, name: 'Intermediate', usedAt: new Date('2026-10-20') }]);
    expect(module.ids.get(31)?.name).toBe('New');
    expect(module.ids.get(42)?.name).toBe('Unrelated');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][1]).toEqual([1, 31]);
  });

  it('also loads usage when resolving an existing party by normalized name', async () => {
    const { module, insert, execute } = createPartyModule(PartyModule);
    await module.initialize();
    await insert([
      {
        provider: 'moe',
        providerId: 'new-provider',
        name: ' Current ',
        usedAt: new Date('2026-10-19')
      }
    ]);
    expect(execute.mock.calls[0][1]).toEqual([1, 31]);
    expect(module.resolve('moe', 'new-provider', 'Current')?.id).toBe(31);
  });

  it('inserts a new party without reading resource history', async () => {
    const { module, insert, execute } = createPartyModule(PartyModule);
    await module.initialize();
    await insert([
      { provider: 'dmhy', providerId: 'new', name: 'Brand new', usedAt: new Date('2026-10-21') }
    ]);
    expect(module.resolve('dmhy', 'new', 'Brand new')?.id).toBe(100);
    expect(execute).not.toHaveBeenCalled();
  });
});
