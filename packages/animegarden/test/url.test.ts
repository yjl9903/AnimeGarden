import { describe, expect, it } from 'vitest';

import { parseSearchURL } from '../src';

describe('parse url', () => {
  it('page and page size should work', () => {
    expect(parseSearchURL(new URLSearchParams('page=1&pageSize=10'))).toMatchInlineSnapshot(`
      {
        "after": undefined,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 10,
        "publisherId": undefined,
        "search": undefined,
        "type": undefined,
      }
    `);

    expect(parseSearchURL(new URLSearchParams('page=2&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "after": undefined,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "include": undefined,
        "page": 2,
        "pageSize": 1000,
        "publisherId": undefined,
        "search": undefined,
        "type": undefined,
      }
    `);

    expect(parseSearchURL(new URLSearchParams('page=2.2&pageSize=4.6'))).toMatchInlineSnapshot(`
      {
        "after": undefined,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "include": undefined,
        "page": 2,
        "pageSize": 5,
        "publisherId": undefined,
        "search": undefined,
        "type": undefined,
      }
    `);

    expect(parseSearchURL(new URLSearchParams('page=-1&pageSize=1000000'))).toMatchInlineSnapshot(`
      {
        "after": undefined,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 1000,
        "publisherId": undefined,
        "search": undefined,
        "type": undefined,
      }
    `);
  });

  it('before and after should work', () => {
    expect(parseSearchURL(new URLSearchParams(`after=2023-06-14`))).toMatchInlineSnapshot(`
      {
        "after": 2023-06-14T00:00:00.000Z,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 100,
        "publisherId": undefined,
        "search": undefined,
        "type": undefined,
      }
    `);

    expect(parseSearchURL(new URLSearchParams(`before=${new Date('2023-06-13').getTime()}`)))
      .toMatchInlineSnapshot(`
        {
          "after": undefined,
          "before": 2023-06-13T00:00:00.000Z,
          "exclude": undefined,
          "fansubId": undefined,
          "include": undefined,
          "page": 1,
          "pageSize": 100,
          "publisherId": undefined,
          "search": undefined,
          "type": undefined,
        }
      `);
  });

  it('complex include', () => {
    const wrap = (o: string | (string | string[])[]) =>
      new URLSearchParams('include=' + JSON.stringify(o));
    expect(parseSearchURL(wrap(['hello', 'world'])).include).toMatchInlineSnapshot(`
      [
        [
          "hello",
        ],
        [
          "world",
        ],
      ]
    `);
    expect(parseSearchURL(wrap(['hello', ['world1', 'world2']])).include).toMatchInlineSnapshot(`
      [
        [
          "hello",
        ],
        [
          "world1",
          "world2",
        ],
      ]
    `);
    expect(parseSearchURL(wrap('world')).include).toMatchInlineSnapshot(`
      [
        [
          "world",
        ],
      ]
    `);
  });

  it('complex filter options', () => {
    const params = [
      'after=2023-06-10',
      'before=2023-06-13',
      'fansub=123',
      'publisher=456',
      'page=2',
      'pageSize=100',
      'search=' + JSON.stringify(['hello', 'world']),
      'include=' + JSON.stringify(['hello', ['world1', 'world3']]),
      'exclude=' + JSON.stringify(['hi']),
      'type=动画'
    ];
    expect(parseSearchURL(new URLSearchParams(params.join('&')))).toMatchInlineSnapshot(`
      {
        "after": 2023-06-10T00:00:00.000Z,
        "before": 2023-06-13T00:00:00.000Z,
        "exclude": [
          "hi",
        ],
        "fansubId": undefined,
        "include": [
          [
            "hello",
          ],
          [
            "world1",
            "world3",
          ],
        ],
        "page": 2,
        "pageSize": 100,
        "publisherId": undefined,
        "search": [
          "\\"hello\\"",
          "\\"world\\"",
        ],
        "type": "动画",
      }
    `);
  });
});
