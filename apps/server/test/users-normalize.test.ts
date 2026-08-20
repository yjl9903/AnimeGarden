import { describe, expect, it } from 'vitest';

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
