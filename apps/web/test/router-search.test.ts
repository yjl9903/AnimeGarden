import { describe, expect, it } from 'vitest';

import { parseRouterSearch, stringifyRouterSearch } from '../src/router';
import { toResourcesRouterSearch } from '../src/utils/routes';

describe('router search params', () => {
  it('keeps repeated query keys instead of JSON stringifying arrays', () => {
    const search = parseRouterSearch('?type=动画&type=合集&preset=bangumi');

    expect(search).toEqual({
      type: ['动画', '合集'],
      preset: 'bangumi'
    });
    expect(stringifyRouterSearch(search)).toBe(
      '?type=%E5%8A%A8%E7%94%BB&type=%E5%90%88%E9%9B%86&preset=bangumi'
    );
  });

  it('preserves explicit and provider-derived duplicate filters for provider queries', () => {
    expect(toResourcesRouterSearch('?provider=dmhy&duplicate=true')).toEqual({
      provider: 'dmhy',
      duplicate: 'true'
    });
    expect(toResourcesRouterSearch('?provider=dmhy')).toEqual({
      provider: 'dmhy',
      duplicate: 'true'
    });
  });
});
