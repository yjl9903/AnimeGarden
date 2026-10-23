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

  it('should parse duplicate=false as false', () => {
    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&duplicate=false`)).filter).toEqual({
      provider: 'dmhy',
      duplicate: false
    });

    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&duplicate=0`)).filter).toEqual({
      provider: 'dmhy',
      duplicate: false
    });

    expect(
      parseURLSearch(new URLSearchParams(`provider=dmhy&duplicate=`), { duplicate: false }).filter
    ).toEqual({
      provider: 'dmhy',
      duplicate: false
    });
  });

  it('should parse body duplicate=false as false', () => {
    expect(parseURLSearch(undefined, { provider: 'dmhy', duplicate: false }).filter).toEqual({
      provider: 'dmhy',
      duplicate: false
    });

    expect(
      parseURLSearch(undefined, { provider: 'dmhy', duplicate: 'false' as any }).filter
    ).toEqual({
      provider: 'dmhy',
      duplicate: false
    });
  });

  it('should parse duplicate=true as true', () => {
    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&duplicate=true`)).filter).toEqual({
      provider: 'dmhy',
      duplicate: true
    });

    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&duplicate=1`)).filter).toEqual({
      provider: 'dmhy',
      duplicate: true
    });

    expect(parseURLSearch(undefined, { provider: 'dmhy', duplicate: true }).filter).toEqual({
      provider: 'dmhy',
      duplicate: true
    });

    expect(
      parseURLSearch(undefined, { provider: 'dmhy', duplicate: 'true' as any }).filter
    ).toEqual({
      provider: 'dmhy',
      duplicate: true
    });
  });

  it('should fallback invalid duplicate values to unset', () => {
    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&duplicate=abc`)).filter).toEqual({
      provider: 'dmhy',
      duplicate: true
    });
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

  it('should stringify explicit duplicate=false', () => {
    expect(stringifyURLSearch({ duplicate: false }).toString()).toBe('duplicate=false');

    expect(stringifyURLSearch({ provider: 'dmhy', duplicate: false }).toString()).toBe(
      'duplicate=false&provider=dmhy'
    );
  });

  it('should stringify duplicate=true and keep unset indistinguishable from missing', () => {
    expect(stringifyURLSearch({ duplicate: true }).toString()).toBe('duplicate=true');

    expect(stringifyURLSearch({}).toString()).toBe('');
    expect(stringifyURLSearch({ duplicate: undefined }).toString()).toBe('');
  });

  it('should roundtrip explicit duplicate=false', () => {
    const params = stringifyURLSearch({ provider: 'dmhy', duplicate: false });

    expect(parseURLSearch(params).filter).toEqual({
      provider: 'dmhy',
      duplicate: false
    });
  });
});
