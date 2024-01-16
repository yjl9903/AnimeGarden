import { describe, expect, it } from 'vitest';

import { parseSearchURL, stringifySearchURL } from '../src';

describe('parse url', () => {
  it('page and page size should work', () => {
    expect(parseSearchURL(new URLSearchParams('page=1&pageSize=10'))).toMatchInlineSnapshot(`
      {
        "after": undefined,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "fansubName": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 10,
        "provider": undefined,
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
        "fansubName": undefined,
        "include": undefined,
        "page": 2,
        "pageSize": 1000,
        "provider": undefined,
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
        "fansubName": undefined,
        "include": undefined,
        "page": 2,
        "pageSize": 5,
        "provider": undefined,
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
        "fansubName": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 1000,
        "provider": undefined,
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
        "fansubName": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 100,
        "provider": undefined,
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
          "fansubName": undefined,
          "include": undefined,
          "page": 1,
          "pageSize": 100,
          "provider": undefined,
          "publisherId": undefined,
          "search": undefined,
          "type": undefined,
        }
      `);
  });

  it('parse search', () => {
    expect(parseSearchURL(new URLSearchParams(`search=你好世界`))).toMatchInlineSnapshot(`
      {
        "after": undefined,
        "before": undefined,
        "exclude": undefined,
        "fansubId": undefined,
        "fansubName": undefined,
        "include": undefined,
        "page": 1,
        "pageSize": 100,
        "provider": undefined,
        "publisherId": undefined,
        "search": [
          "你好世界",
        ],
        "type": undefined,
      }
    `);
  });

  it('complex include', () => {
    const wrap = (o: string | string[]) => new URLSearchParams('include=' + JSON.stringify(o));

    expect(parseSearchURL(wrap(['hello', 'world'])).include).toMatchInlineSnapshot(`
      [
        "hello",
        "world",
      ]
    `);
    expect(parseSearchURL(wrap(['hello', 'world1', 'world2'])).include).toMatchInlineSnapshot(`
      [
        "hello",
        "world1",
        "world2",
      ]
    `);
    expect(parseSearchURL(wrap('world')).include).toMatchInlineSnapshot(`
      [
        "world",
      ]
    `);
  });

  it('complex filter options', () => {
    const params = [
      'after=2023-06-10',
      'before=2023-06-13',
      'fansubId=[123]',
      'fansubName="字幕组"',
      'publisherId=456',
      'page=2',
      'pageSize=100',
      'search=' + JSON.stringify(['hello', 'world']),
      'include=' + JSON.stringify(['hello', 'world1', 'world3']),
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
        "fansubName": [
          "字幕组",
        ],
        "include": [
          "hello",
          "world1",
          "world3",
        ],
        "page": 2,
        "pageSize": 100,
        "provider": undefined,
        "publisherId": undefined,
        "search": [
          "hello",
          "world",
        ],
        "type": "动画",
      }
    `);

    expect(
      stringifySearchURL(
        `https://garden.onekuma.cn/api/`,
        parseSearchURL(new URLSearchParams(params.join('&')))
      )
    ).toMatchInlineSnapshot(
      `"https://garden.onekuma.cn/api/resources?page=2&pageSize=100&fansubName=%5B%22%E5%AD%97%E5%B9%95%E7%BB%84%22%5D&type=%E5%8B%95%E7%95%AB&before=1686614400000&after=1686355200000&search=%5B%22hello%22%2C%22world%22%5D&include=%5B%22hello%22%2C%22world1%22%2C%22world3%22%5D&exclude=%5B%22hi%22%5D"`
    );
  });
});
