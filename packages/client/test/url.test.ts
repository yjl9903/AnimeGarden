import { describe, expect, it } from 'vitest';

import { parseURLSearch, stringifyURLSearch } from '../src';

describe('parse url', () => {
  it('page and page size should work', () => {
    expect(parseURLSearch(new URLSearchParams('page=1&pageSize=10'))).toMatchInlineSnapshot(`
      {
        "page": 1,
        "pageSize": 10,
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=2&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "page": 2,
        "pageSize": 100,
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=2.2&pageSize=4.6'))).toMatchInlineSnapshot(`
      {
        "page": 2,
        "pageSize": 5,
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=-1&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "page": 1,
        "pageSize": 100,
      }
    `);
  });

  it('before and after should work', () => {
    expect(parseURLSearch(new URLSearchParams(`after=2023-06-14`))).toMatchInlineSnapshot(`
      {
        "after": 2023-06-14T00:00:00.000Z,
        "page": 1,
        "pageSize": 100,
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`before=${new Date('2023-06-13').getTime()}`)))
      .toMatchInlineSnapshot(`
        {
          "before": 2023-06-13T00:00:00.000Z,
          "page": 1,
          "pageSize": 100,
        }
      `);
  });

  it('parse search', () => {
    expect(parseURLSearch(new URLSearchParams(`search=你好世界`))).toMatchInlineSnapshot(`
      {
        "page": 1,
        "pageSize": 100,
        "search": [
          "你好世界",
        ],
      }
    `);
  });

  it('should infer duplicate', () => {
    expect(parseURLSearch(new URLSearchParams(`provider=dmhy`))).toMatchInlineSnapshot(`
      {
        "duplicate": true,
        "page": 1,
        "pageSize": 100,
        "provider": "dmhy",
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&provider=moe`)))
      .toMatchInlineSnapshot(`
        {
          "duplicate": true,
          "page": 1,
          "pageSize": 100,
          "provider": "dmhy",
        }
      `);
  });

  it('multiple include', () => {
    const wrap = (o: string[]) => new URLSearchParams(o.map((o) => `include=${o}`).join('&'));

    expect(parseURLSearch(wrap(['hello', 'world'])).include).toMatchInlineSnapshot(`
      [
        "hello",
        "world",
      ]
    `);
    expect(parseURLSearch(wrap(['hello', 'world1', 'world2'])).include).toMatchInlineSnapshot(`
      [
        "hello",
        "world1",
        "world2",
      ]
    `);
    expect(parseURLSearch(wrap(['world'])).include).toMatchInlineSnapshot(`
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
        "after": 2023-06-10T00:00:00.000Z,
        "before": 2023-06-13T00:00:00.000Z,
        "exclude": [
          "h1",
        ],
        "fansubs": [
          "abc",
          "def",
        ],
        "page": 2,
        "pageSize": 100,
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
      }
    `);
  });
});

describe('parse url with body', () => {
  it('should work', () => {
    expect(parseURLSearch(new URLSearchParams(), { page: 2 })).toMatchInlineSnapshot(`
      {
        "page": 2,
        "pageSize": 100,
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

    expect(
      stringifyURLSearch(parseURLSearch(new URLSearchParams(params.join('&')))).toString()
    ).toMatchInlineSnapshot(
      `"after=1686355200000&before=1686614400000&exclude=h1&fansub=abc&fansub=def&page=2&pageSize=100&publisher=456&search=hello&search=world&type=%E5%8A%A8%E7%94%BB"`
    );
  });
});
