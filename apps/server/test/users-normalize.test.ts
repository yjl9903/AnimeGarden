import { describe, expect, it } from 'vitest';

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
