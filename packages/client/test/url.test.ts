import { describe, expect, it } from 'vitest';

import { parseURLSearch, stringifyURLSearch } from '../src';

describe('parse url', () => {
  it('limit and opaque cursor should work', () => {
    expect(parseURLSearch(new URLSearchParams('limit=10&cursor=opaque&anchor=2026-07-11')))
      .toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "cursor": "opaque",
          "limit": 10,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams('limit=1000000'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "limit": 30,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams('limit=4.6'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "limit": 5,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams('limit=-1'))).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "limit": 30,
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
          "limit": 30,
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
            "limit": 30,
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
          "limit": 30,
        },
      }
    `);
  });

  it('parses a single provider', () => {
    expect(parseURLSearch(new URLSearchParams(`provider=dmhy`))).toMatchInlineSnapshot(`
      {
        "filter": {
          "provider": "dmhy",
        },
        "pagination": {
          "limit": 30,
        },
      }
    `);

    expect(parseURLSearch(new URLSearchParams(`provider=dmhy&provider=moe`)))
      .toMatchInlineSnapshot(`
        {
          "filter": {
            "provider": "dmhy",
          },
          "pagination": {
            "limit": 30,
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
      'limit=100',
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
          "limit": 100,
        },
      }
    `);
  });
});

describe('parse url with body', () => {
  it('should work', () => {
    expect(parseURLSearch(new URLSearchParams(), { limit: 20 })).toMatchInlineSnapshot(`
      {
        "filter": {},
        "pagination": {
          "limit": 20,
        },
      }
    `);
  });
});

describe('canonical query round trips', () => {
  it('gives equivalent queries the same filter ordering and URL', () => {
    const first = parseURLSearch(
      new URLSearchParams(
        'subject=10&subject=2&subject=10&publisher=B&publisher=A&publisher=A&limit=30&unknown=x'
      )
    );
    const second = parseURLSearch(
      new URLSearchParams('publisher=A&publisher=B&subject=2&subject=10')
    );
    expect(first).toEqual(second);
    expect(stringifyURLSearch({ ...first.filter, ...first.pagination }).toString()).toBe(
      'publisher=A&publisher=B&subject=2&subject=10'
    );
    expect(first.pagination).toEqual({ limit: 30 });
  });

  it.each(['search', 'include'] as const)(
    'normalizes %s and other collections without mutating input',
    (mode) => {
      const body = {
        publishers: ['B', 'A', 'B'],
        fansubs: ['B', 'A', 'B'],
        types: ['B', 'A', 'B'],
        [mode]: ['B', 'A', 'B'],
        keywords: ['B', 'A', 'B'],
        exclude: ['B', 'A', 'B'],
        subjects: [10, 2, 10],
        after: new Date('2026-01-01')
      };
      const original = structuredClone(body);
      const { filter } = parseURLSearch(undefined, body);
      for (const key of [mode, 'publishers', 'fansubs', 'types', 'keywords', 'exclude'] as const) {
        expect(filter[key]).toEqual(['A', 'B']);
        expect(filter[key]).not.toBe(body[key]);
      }
      expect(filter.subjects).toEqual([2, 10]);
      const params = stringifyURLSearch(body);
      for (const key of [mode, 'publisher', 'fansub', 'type', 'keyword', 'exclude']) {
        expect(params.getAll(key)).toEqual(['A', 'B']);
      }
      expect(params.getAll('subject')).toEqual(['2', '10']);
      expect(params.get('after')).toBe(String(body.after.getTime()));
      expect(body).toEqual(original);
    }
  );

  it('omits URL defaults while preserving provider and cursors', () => {
    const defaults = parseURLSearch(new URLSearchParams('provider=dmhy'));
    expect(defaults.filter).toEqual({ provider: 'dmhy' });
    expect(stringifyURLSearch({ ...defaults.pagination, ...defaults.filter }).toString()).toBe(
      'provider=dmhy'
    );
    const custom = { provider: 'dmhy', cursor: 'opaque', limit: 10 };
    const params = stringifyURLSearch(custom);
    expect(params.toString()).toBe('cursor=opaque&limit=10&provider=dmhy');
    expect(parseURLSearch(params)).toEqual({
      filter: { provider: 'dmhy' },
      pagination: { cursor: 'opaque', limit: 10 }
    });
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
      'limit=100',
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
      `"after=1686355200000&before=1686614400000&exclude=h1&fansub=abc&fansub=def&limit=100&publisher=456&search=hello&search=world&type=%E5%8A%A8%E7%94%BB"`
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
    expect(params.getAll('exclude')).toEqual(['NCOP', 'PV']);
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
