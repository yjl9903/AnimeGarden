import { describe, expect, it } from 'vitest';

import { getCanonicalURL } from '../src/utils/canonical';

describe('getCanonicalURL', () => {
  it('removes cursor pagination params and sorts the remaining params', () => {
    expect(
      getCanonicalURL(
        '/resources/',
        '?type=动画&limit=30&search=BanG+Dream&cursor=next&fansub=ANi&anchor=2026-07-01'
      )
    ).toBe('https://animes.garden/resources?fansub=ANi&search=BanG+Dream&type=%E5%8A%A8%E7%94%BB');
  });

  it('omits the question mark when only pagination params remain', () => {
    expect(getCanonicalURL('/resources', 'anchor=2026-07-01&cursor=next&limit=30')).toBe(
      'https://animes.garden/resources'
    );
  });
});
