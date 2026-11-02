import { describe, expect, it } from 'vitest';
import { encodeResourcesCursor } from '@animegarden/shared';
import { parseResourcesQuery } from '../src/server/utils/resources-query';

const latest = Date.parse('2026-07-01');

describe('resource query input boundary', () => {
  it.each([
    { search: 'page=101&pageSize=100', body: undefined, limit: 100 },
    { search: 'page=invalid', body: undefined, limit: 30 },
    { search: '', body: { page: 7, pageSize: 50 }, limit: 50 },
    { search: 'limit=20&pageSize=100', body: undefined, limit: 20 },
    { search: '', body: { limit: 20, pageSize: 100 }, limit: 20 },
    { search: 'pageSize=40', body: { limit: 20 }, limit: 40 },
    { search: 'limit=20', body: { pageSize: 40 }, limit: 20 },
    { search: 'pageSize=40', body: { pageSize: 50 }, limit: 40 },
    { search: 'pageSize=1000', body: undefined, limit: 1000 },
    { search: 'pageSize=1001', body: undefined, limit: 30 },
    { search: 'pageSize=1.5', body: undefined, limit: 2 }
  ])('normalizes legacy pagination: $search / $body', ({ search, body, limit }) => {
    const params = new URLSearchParams(search);
    const original = structuredClone(body);
    expect(parseResourcesQuery(params, body)).toEqual({ filter: {}, pagination: { limit } });
    expect(params.toString()).toBe(search);
    expect(body).toEqual(original);
  });

  it('preserves an explicit cursor when legacy page parameters are present', () => {
    const cursor = { anchor: latest, position: { createdAt: latest - 1000, id: 42 } };
    const params = new URLSearchParams({
      page: '99',
      pageSize: '20',
      cursor: encodeResourcesCursor(cursor),
      type: '动画'
    });
    expect(parseResourcesQuery(params, undefined)).toEqual({
      filter: { types: ['动画'] },
      pagination: { limit: 20, cursor }
    });
  });

  it('ignores unknown query and body fields without treating them as legacy parameters', () => {
    const cursor = { anchor: latest };
    expect(
      parseResourcesQuery(new URLSearchParams({ anchor: 'invalid', unknown: 'value' }), {
        anchor: null,
        unknown: true,
        cursor: encodeResourcesCursor(cursor)
      })
    ).toEqual({ filter: {}, pagination: { limit: 30, cursor } });
  });

  it.each([
    ['0', 30],
    ['-1', 30],
    ['1001', 30],
    ['NaN', 30],
    ['Infinity', 30],
    ['1.5', 2],
    ['100', 100],
    ['101', 101],
    ['1000', 1000]
  ])('normalizes limit=%s to %s before querying', (limit, expected) => {
    expect(parseResourcesQuery(new URLSearchParams({ limit }), undefined)).toEqual({
      filter: {},
      pagination: { limit: expected }
    });
  });

  it('resolves body cursor and limit and preserves URL precedence', () => {
    const cursor = { anchor: latest - 1000, position: { createdAt: latest - 2000, id: 42 } };
    const body = { cursor: encodeResourcesCursor(cursor), limit: 10, types: ['动画'] };
    expect(parseResourcesQuery(new URLSearchParams(), body)).toEqual({
      filter: { types: ['动画'] },
      pagination: { limit: 10, cursor }
    });
    expect(
      parseResourcesQuery(
        new URLSearchParams({ cursor: encodeResourcesCursor({ anchor: latest }), limit: '20' }),
        body
      ).pagination
    ).toEqual({ limit: 20, cursor: { anchor: latest } });
  });

  it('maps cursor decoding failures to a query validation error', () => {
    expect(() => parseResourcesQuery(new URLSearchParams(), { cursor: 'garbage' })).toThrow(
      'Invalid cursor.'
    );
  });

  it('preserves a future anchor without comparing it to the provider timestamp', () => {
    const cursor = { anchor: Date.parse('2999-01-01') };
    expect(
      parseResourcesQuery(new URLSearchParams(), { cursor: encodeResourcesCursor(cursor) })
        .pagination
    ).toEqual({ limit: 30, cursor });
  });
});
