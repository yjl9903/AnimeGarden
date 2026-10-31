import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchResourcesFn, searchSubjects, resolveSubjectByName, getSubjectByIdResult } = vi.hoisted(
  () => ({
    fetchResourcesFn: vi.fn(),
    searchSubjects: vi.fn(),
    resolveSubjectByName: vi.fn(),
    getSubjectByIdResult: vi.fn()
  })
);

vi.mock('../src/query/proxy', () => ({ fetchResourcesFn }));

import { resourcesQueryOptions } from '../src/query/animegarden';
import { subjectsByNameQueryOptions, subjectSearchQueryOptions } from '../src/query/subject';
import { stringifySearchTextAsync } from '../src/layouts/Search/utils';
import { ResponseStaleTime } from '../src/utils/response';

let client: QueryClient;
const anchor = Date.parse('2026-07-01');
const subject = (title: string) => ({
  id: 42,
  title,
  display_title: title,
  alias: {},
  tags: [],
  search: { include: [title] }
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(anchor);
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const query = client.query.bind(client);
  // Stub only leaf transports; preserve the real nested calls, cache and caller-supplied staleTime.
  const execute = (options: Parameters<QueryClient['query']>[0]) => {
    const key = options.queryKey;
    if (key[1] === 'subjects' && key[2] === 'search' && key.length === 5) {
      return query({
        ...options,
        queryFn: async () => ({ ok: true, subjects: await searchSubjects(key[3], key[4]) })
      });
    }
    if (key[1] === 'subject' && key[2] === 'name') {
      return query({
        ...options,
        queryFn: async () => ({ ok: true, subject: await resolveSubjectByName(key[3]) })
      });
    }
    if (key[1] === 'subject' && typeof key[2] === 'number') {
      return query({ ...options, queryFn: () => getSubjectByIdResult(key[2]) });
    }
    return query(options);
  };
  vi.spyOn(client, 'query').mockImplementation(execute as QueryClient['query']);
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('imperative queries honor business staleTime', () => {
  it('reuses a fresh resource preview and requests again after one minute or explicit invalidation', async () => {
    fetchResourcesFn.mockResolvedValue({
      ok: true,
      resources: [],
      pagination: { anchor, limit: 30, nextCursor: null, complete: true },
      timestamp: new Date(anchor),
      filter: {}
    });
    const options = resourcesQueryOptions({ types: ['动画'] });
    await client.query(options);
    await client.query(options);
    expect(fetchResourcesFn).toHaveBeenCalledOnce();

    vi.setSystemTime(anchor + ResponseStaleTime.List + 1);
    expect(client.getQueryData(options.queryKey)).toBeDefined();
    await client.query(options);
    expect(fetchResourcesFn).toHaveBeenCalledTimes(2);

    await client.invalidateQueries({ queryKey: options.queryKey, refetchType: 'none' });
    await client.query(options);
    expect(fetchResourcesFn).toHaveBeenCalledTimes(3);
  });

  it('refreshes expired keyword subqueries rather than rebuilding an aggregate from stale children', async () => {
    searchSubjects.mockResolvedValueOnce([subject('Old')]).mockResolvedValueOnce([subject('New')]);
    const options = subjectSearchQueryOptions(['title']);
    expect((await client.query(options)).subjects[0].title).toBe('Old');
    expect((await client.query(options)).subjects[0].title).toBe('Old');
    expect(searchSubjects).toHaveBeenCalledOnce();

    vi.setSystemTime(anchor + ResponseStaleTime.Subject + 1);
    expect(client.getQueryData(['api', 'subjects', 'search', 'title', 20])).toBeDefined();
    expect((await client.query(options)).subjects[0].title).toBe('New');
    expect(searchSubjects).toHaveBeenCalledTimes(2);
  });

  it('refreshes expired name-resolution subqueries', async () => {
    resolveSubjectByName
      .mockResolvedValueOnce(subject('Old'))
      .mockResolvedValueOnce(subject('New'));
    const options = subjectsByNameQueryOptions(['title']);
    expect((await client.query(options)).subjects[0].title).toBe('Old');
    await client.query(options);
    expect(resolveSubjectByName).toHaveBeenCalledOnce();

    vi.setSystemTime(anchor + ResponseStaleTime.Subject + 1);
    expect(client.getQueryData(['api', 'subject', 'name', 'title'])).toBeDefined();
    expect((await client.query(options)).subjects[0].title).toBe('New');
    expect(resolveSubjectByName).toHaveBeenCalledTimes(2);
  });

  it('refreshes expired Subject data used to build search text', async () => {
    getSubjectByIdResult
      .mockResolvedValueOnce({ ok: true, subject: subject('Old') })
      .mockResolvedValueOnce({ ok: true, subject: subject('New') });
    const search = new URLSearchParams('subject=42');
    expect(await stringifySearchTextAsync(client, search)).toContain('Old');
    expect(await stringifySearchTextAsync(client, search)).toContain('Old');
    expect(getSubjectByIdResult).toHaveBeenCalledOnce();

    vi.setSystemTime(anchor + ResponseStaleTime.Subject + 1);
    expect(await stringifySearchTextAsync(client, search)).toContain('New');
    expect(getSubjectByIdResult).toHaveBeenCalledTimes(2);
  });
});
