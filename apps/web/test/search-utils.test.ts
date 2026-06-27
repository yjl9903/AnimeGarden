import { describe, expect, it, beforeAll } from 'vitest';

import {
  parseSearchInput,
  resolveSearchURL,
  stringifySearchTextAsync
} from '../src/layouts/Search/utils';
import { subjectSearchQueryOptions } from '../src/query/subject';

const queryClient = {
  ensureQueryData: async () => ({
    subject: { id: 330279, title: '葬送的芙莉莲' },
    subjects: [{ id: 330279 }]
  })
} as any;

describe('search utils', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'location', {
      value: {
        origin: 'https://animes.garden',
        host: 'animes.garden'
      },
      configurable: true
    });
  });

  it('parses subject names without resolving bgmd on the client', () => {
    const filter = parseSearchInput('动画:葬送的芙莉莲');

    expect(filter.subjects).toEqual(['葬送的芙莉莲']);
  });

  it('keeps regular and advanced search fields', () => {
    const filter = parseSearchInput('葬送 简体 包含:1080p 排除:繁体 类型:动画');

    expect(filter).toMatchObject({
      search: [],
      include: ['葬送', '简体'],
      keywords: ['1080p'],
      exclude: ['繁体'],
      types: ['动画'],
      subjects: []
    });
  });

  it('builds subject URLs after subject names are resolved', async () => {
    await expect(resolveSearchURL(queryClient, '动画:葬送的芙莉莲')).resolves.toBe(
      '/subject/330279'
    );
  });

  it('builds resource URLs when subject search has extra filters', async () => {
    await expect(resolveSearchURL(queryClient, '动画:葬送的芙莉莲 包含:1080p')).resolves.toBe(
      '/resources/1?keyword=1080p&subject=330279'
    );
  });

  it('stringifies subject ids with async subject titles', async () => {
    await expect(
      stringifySearchTextAsync(queryClient, new URLSearchParams('subject=330279'))
    ).resolves.toBe('动画:葬送的芙莉莲');
  });

  it('ranks subject suggestions by matched keyword count then id descending', async () => {
    const subject = (id: number) => ({ id, title: `subject-${id}`, search: { include: [] } });
    const subjectsByKeyword: Record<string, ReturnType<typeof subject>[]> = {
      foo: [subject(1), subject(2), subject(4), subject(5), subject(3)],
      bar: [subject(5), subject(3), subject(4)]
    };
    const query = subjectSearchQueryOptions(['foo', 'bar']);
    const result = await query.queryFn!({
      signal: new AbortController().signal,
      client: {
        ensureQueryData: async (options: { queryKey: readonly unknown[] }) => {
          const limit = options.queryKey[4] as number;
          return {
            ok: true,
            subjects: subjectsByKeyword[options.queryKey[3] as string].slice(0, limit)
          };
        }
      }
    } as any);

    expect(result.subjects.map((item) => item.id)).toEqual([5, 4, 3]);
  });
});
