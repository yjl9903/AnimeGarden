import { describe, expect, it } from 'vitest';

import { parseURLSearch, stringifyURLSearch } from '../src';

describe('parse url', () => {
  it('page and page size should work', () => {
    expect(parseURLSearch(new URLSearchParams('page=1&pageSize=10'))).toMatchInlineSnapshot(`
      {
        "duplicate": false,
        "page": 1,
        "pageSize": 10,
        "providers": [
          "dmhy",
          "moe",
          "ani",
        ],
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=2&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "duplicate": false,
        "page": 2,
        "pageSize": 100,
        "providers": [
          "dmhy",
          "moe",
          "ani",
        ],
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=2.2&pageSize=4.6'))).toMatchInlineSnapshot(`
      {
        "duplicate": false,
        "page": 2,
        "pageSize": 5,
        "providers": [
          "dmhy",
          "moe",
          "ani",
        ],
      }
    `);

    expect(parseURLSearch(new URLSearchParams('page=-1&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "duplicate": false,
        "page": 1,
        "pageSize": 100,
        "providers": [
          "dmhy",
          "moe",
          "ani",
        ],
      }
    `);
  });

  it('before and after should work', () => {
    expect(parseURLSearch(new URLSearchParams(`after=2023-06-14`))).toMatchInlineSnapshot(`
      {
        "after": 2023-06-14T00:00:00.000Z,
        "duplicate": false,
        "page": 1,
        "pageSize": 100,
        "providers": [
          "dmhy",
          "moe",
          "ani",
        ],
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`before=${new Date('2023-06-13').getTime()}`)))
      .toMatchInlineSnapshot(`
        {
          "before": 2023-06-13T00:00:00.000Z,
          "duplicate": false,
          "page": 1,
          "pageSize": 100,
          "providers": [
            "dmhy",
            "moe",
            "ani",
          ],
        }
      `);
  });

  it('parse search', () => {
    expect(parseURLSearch(new URLSearchParams(`search=你好世界`))).toMatchInlineSnapshot(`
      {
        "duplicate": false,
        "page": 1,
        "pageSize": 100,
        "providers": [
          "dmhy",
          "moe",
          "ani",
        ],
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
        "providers": [
          "dmhy",
        ],
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&provider=moe`)))
      .toMatchInlineSnapshot(`
        {
          "duplicate": true,
          "page": 1,
          "pageSize": 100,
          "providers": [
            "dmhy",
            "moe",
          ],
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
        "duplicate": false,
        "exclude": [
          "h1",
        ],
        "fansubs": [
          "abc",
          "def",
        ],
        "page": 2,
        "pageSize": 100,
        "providers": [
          "dmhy",
          "moe",
          "ani",
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
      }
    `);

    expect(
      stringifyURLSearch(parseURLSearch(new URLSearchParams(params.join('&')))).toString()
    ).toMatchInlineSnapshot(
      `"after=1686355200000&before=1686614400000&exclude=h1&fansub=def&page=2&pageSize=100&provider=dmhy&provider=moe&provider=ani&publisher=456&search=hello&search=world&type=%E5%8A%A8%E7%94%BB"`
    );
  });
});
