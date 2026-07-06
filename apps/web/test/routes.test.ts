import { describe, expect, it } from 'vitest';

import { getResourcesRouteLink, toResourcesRouterSearch } from '../src/utils/routes';

describe('resources route links', () => {
  it('inherits only supported resource search params', () => {
    expect(
      toResourcesRouterSearch(
        '?fansub=ANi&xt=urn%3Abtih%3ALLL57QPCVEIPNF2MJLHKP6CX3MSMDYCC&type=动画&pageSize=40'
      )
    ).toEqual({
      fansub: 'ANi',
      pageSize: '40',
      type: '动画'
    });
  });

  it('filters raw search strings passed to resources links', () => {
    expect(getResourcesRouteLink(1, '?fansub=ANi&xt=bad')).toMatchObject({
      search: { fansub: 'ANi' }
    });
  });
});
