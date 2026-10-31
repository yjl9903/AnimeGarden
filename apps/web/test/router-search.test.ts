import { describe, expect, it } from 'vitest';

import { parseURLSearch } from '@animegarden/client';

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

  it.each([
    ['?provider=dmhy&duplicate=true', true],
    ['?provider=dmhy', true],
    ['?provider=dmhy&duplicate=false', false]
  ] as const)('preserves duplicate semantics while omitting defaults: %s', (input, duplicate) => {
    const search = toResourcesRouterSearch(input);
    expect(search).toEqual(
      duplicate ? { provider: 'dmhy' } : { provider: 'dmhy', duplicate: 'false' }
    );
    const params = new URLSearchParams(stringifyRouterSearch(search));
    expect(parseURLSearch(params).filter).toEqual({ provider: 'dmhy', duplicate });
  });
});
