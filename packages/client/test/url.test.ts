import { describe, expect, it } from 'vitest';

import { parseURLSearch, stringifyURLSearch } from '../src';

describe('parse url', () => {
  it('page and page size should work', () => {
    expect(parseURLSearch(new URLSearchParams('page=1&pageSize=10'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "page": 1,
          "pageSize": 10,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=2&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "page": 2,
          "pageSize": 100,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=2.2&pageSize=4.6'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "page": 2,
          "pageSize": 5,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=-1&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "page": 1,
          "pageSize": 100,
        },
      }
    `);
  });

  it('before and after should work', () => {
    expect(parseURLSearch(new URLSearchParams(`after=2023-06-14`))).toMatchInlineSnapshot(`
      {
        "filter": {
          "after": 2023-06-14T00:00:00.000Z,
        },
        "pagination": {
          "page": 1,
          "pageSize": 100,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`before=${new Date('2023-06-13').getTime()}`)))
      .toMatchInlineSnapshot(`
        {
          "filter": {
            "before": 2023-06-13T00:00:00.000Z,
          },
          "pagination": {
            "page": 1,
            "pageSize": 100,
          },
        }
      `);
  });

  it('parse search', () => {
    expect(parseURLSearch(new URLSearchParams(`search=你好世界`))).toMatchInlineSnapshot(`
      {
        "filter": {
          "search": [
            "你好世界",
          ],
        },
        "pagination": {
          "page": 1,
          "pageSize": 100,
        },
      }
    `);
  });

  it('should infer duplicate', () => {
    expect(parseURLSearch(new URLSearchParams(`provider=dmhy`))).toMatchInlineSnapshot(`
      {
        "filter": {
          "duplicate": true,
          "provider": "dmhy",
        },
        "pagination": {
          "page": 1,
          "pageSize": 100,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&provider=moe`)))
      .toMatchInlineSnapshot(`
        {
          "filter": {
            "duplicate": true,
            "provider": "dmhy",
          },
          "pagination": {
            "page": 1,
            "pageSize": 100,
          },
        }
      `);
  });

  it('multiple include', () => {
    const wrap = (o: string[]) => new URLSearchParams(o.map((o) => `include=${o}`).join('&'));

    expect(parseURLSearch(wrap(['hello', 'world'])).filter.include).toMatchInlineSnapshot(`
      [
        "hello",
        "world",
      ]
    `);
    expect(parseURLSearch(wrap(['hello', 'world1', 'world2'])).filter.include)
      .toMatchInlineSnapshot(`
      [
        "hello",
        "world1",
        "world2",
      ]
    `);
    expect(parseURLSearch(wrap(['world'])).filter.include).toMatchInlineSnapshot(`
      [
        "world",
      ]
    `);
  });

  it('complex filter options', () => {
    const params = [
      'after=2023-06-10',
      'before=2023-06-13',
      'fansub=abc',
      'fansub=def',
      'publisher=456',
      'page=2',
      'pageSize=100',
      'search=hello',
      'search=world',
      'include=hello',
      'include=world1',
      'include=world3',
      'keywords=简中',
      'exclude=h1',
      'type=动画'
    ];

    expect(parseURLSearch(new URLSearchParams(params.join('&')))).toMatchInlineSnapshot(`
      {
        "filter": {
          "after": 2023-06-10T00:00:00.000Z,
          "before": 2023-06-13T00:00:00.000Z,
          "exclude": [
            "h1",
          ],
          "fansubs": [
            "abc",
            "def",
          ],
          "publishers": [
            "456",
          ],
          "search": [
            "hello",
            "world",
          ],
          "types": [
            "动画",
          ],
        },
        "pagination": {
          "page": 2,
          "pageSize": 100,
        },
      }
    `);
  });
});

describe('duplicate filter', () => {
  it.each([
    ['', false],
    ['false', false],
    ['0', false],
    ['off', false],
    ['no', false],
    ['true', true],
    ['1', true],
    ['on', true],
    ['yes', true],
    ['FALSE', true],
    ['other', true]
  ])('parses duplicate=%s as %s in URL and body', (value, expected) => {
    const params = new URLSearchParams({ provider: 'dmhy', duplicate: value });
    expect(parseURLSearch(params).filter.duplicate).toBe(expected);
    // HTTP JSON bodies may contain strings even though the SDK accepts booleans.
    const body = JSON.parse(JSON.stringify({ provider: 'dmhy', duplicate: value }));
    expect(parseURLSearch(undefined, body).filter.duplicate).toBe(expected);
  });

  it.each([true, false])('preserves boolean %s through serialization', (duplicate) => {
    const options = { provider: 'dmhy', duplicate };
    expect(parseURLSearch(undefined, options).filter).toEqual(options);
    const params = stringifyURLSearch(options);
    expect(params.get('duplicate')).toBe(String(duplicate));
    expect(parseURLSearch(params).filter).toEqual(options);
  });

  it('omits an unspecified duplicate and keeps the provider default', () => {
    const params = stringifyURLSearch({ provider: 'dmhy' });
    expect(params.has('duplicate')).toBe(false);
    expect(parseURLSearch(params).filter.duplicate).toBe(true);
    expect(parseURLSearch(undefined, { provider: 'dmhy' }).filter.duplicate).toBe(true);
  });

  it.each(['', 'provider=invalid&'])('requires a valid provider: %s', (prefix) => {
    expect(
      parseURLSearch(new URLSearchParams(`${prefix}duplicate=false`)).filter
    ).not.toHaveProperty('duplicate');
  });

  it('preserves URL and body precedence for explicit false', () => {
    expect(
      parseURLSearch(new URLSearchParams('duplicate=false'), {
        provider: 'dmhy',
        duplicate: true
      }).filter.duplicate
    ).toBe(false);
    expect(
      parseURLSearch(new URLSearchParams('provider=dmhy&duplicate=true'), {
        duplicate: false
      }).filter.duplicate
    ).toBe(false);
  });
});

describe('parse url with body', () => {
  it('should work', () => {
    expect(parseURLSearch(new URLSearchParams(), { page: 2 })).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "page": 2,
          "pageSize": 100,
        },
      }
    `);
  });
});

describe('stringify url', () => {
  it('should work', () => {
    const params = [
      'after=2023-06-10',
      'before=2023-06-13',
      'fansub=abc',
      'fansub=def',
      'publisher=456',
      'page=2',
      'pageSize=100',
      'search=hello',
      'search=world',
      'include=hello',
      'include=world1',
      'include=world3',
      'keywords=简中',
      'exclude=h1',
      'type=动画'
    ];

    const { pagination, filter } = parseURLSearch(new URLSearchParams(params.join('&')));

    expect(stringifyURLSearch({ ...pagination, ...filter }).toString()).toMatchInlineSnapshot(
      `"after=1686355200000&before=1686614400000&exclude=h1&fansub=abc&fansub=def&page=2&pageSize=100&publisher=456&search=hello&search=world&type=%E5%8A%A8%E7%94%BB"`
    );
  });

  it('should treat a string search value as a single filter term', () => {
    const params = stringifyURLSearch({ search: '芙莉莲' });

    expect(params.getAll('search')).toEqual(['芙莉莲']);
    expect(params.toString()).toBe(`search=${encodeURIComponent('芙莉莲')}`);
  });

  it('should keep array search values and deduplicate', () => {
    const params = stringifyURLSearch({
      search: ['芙莉莲', '葬送的芙莉莲', '葬送的芙莉莲']
    });

    expect(params.getAll('search')).toEqual(['芙莉莲', '葬送的芙莉莲']);
  });

  it('should treat a string include value as a single filter term', () => {
    const params = stringifyURLSearch({ include: '葬送的芙莉莲' });

    expect(params.getAll('include')).toEqual(['葬送的芙莉莲']);
    expect(params.getAll('search')).toEqual([]);
  });

  it('should treat a string keywords value as a single filter term', () => {
    const params = stringifyURLSearch({ keywords: '简中' });

    expect(params.getAll('keyword')).toEqual(['简中']);
  });

  it('should treat a string exclude value as a single filter term', () => {
    const params = stringifyURLSearch({ exclude: 'PV' });

    expect(params.getAll('exclude')).toEqual(['PV']);
  });

  it('should not split string keywords and exclude in search mode', () => {
    const params = stringifyURLSearch({ search: '芙莉莲', keywords: '简中', exclude: 'PV' });

    expect(params.getAll('search')).toEqual(['芙莉莲']);
    expect(params.getAll('keyword')).toEqual(['简中']);
    expect(params.getAll('exclude')).toEqual(['PV']);
  });

  it('should not split string keywords and exclude in include mode', () => {
    const params = stringifyURLSearch({ include: '葬送的芙莉莲', keywords: '简中', exclude: 'PV' });

    expect(params.getAll('include')).toEqual(['葬送的芙莉莲']);
    expect(params.getAll('keyword')).toEqual(['简中']);
    expect(params.getAll('exclude')).toEqual(['PV']);
  });

  it('should keep deduplicating array keywords and exclude', () => {
    const params = stringifyURLSearch({
      keywords: ['简中', '简中', '繁中'],
      exclude: ['PV', 'PV', 'NCOP']
    });

    expect(params.getAll('keyword')).toEqual(['简中', '繁中']);
    expect(params.getAll('exclude')).toEqual(['PV', 'NCOP']);
  });

  it('should normalize string body filter values in parseURLSearch', () => {
    const { filter } = parseURLSearch(undefined, {
      search: '芙莉莲',
      include: '葬送的芙莉莲',
      keywords: '简中',
      exclude: 'PV'
    });

    expect(filter.search).toEqual(['芙莉莲']);
    // include is dropped when search is present
    expect(filter.include).toBeUndefined();
    expect(filter.keywords).toEqual(['简中']);
    expect(filter.exclude).toEqual(['PV']);
  });
});
