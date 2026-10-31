import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const { fetchCalendar, fetchSubjects, fetchSubject } = vi.hoisted(() => ({
  fetchSubject: vi.fn(),
  fetchCalendar: vi.fn(),
  fetchSubjects: vi.fn()
}));

vi.mock('bgmx', () => ({
  fetchSubject,
  fetchCalendar,
  fetchSubjects
}));

import { SubjectsModule } from '../src/subjects';
import { compareSubjectsByActivedAt } from '../src/server/routes/sitemaps';
import { updateCalendar } from '../src/subjects/bgmd';
import { buildSubjectSearchSql, matchesSubjectSearch } from '../src/subjects/filter';

function bgmxSubject(id: number, include = ['日文标题'], date: string | null = '2026-07-01') {
  return {
    id,
    title: '日文标题',
    alias: {
      ja: ['日文标题'],
      zh: ['中文标题']
    },
    poster: '',
    onair_date: null,
    search: { include },
    bangumi: {
      date,
      platform: 'TV',
      images: { large: 'poster.jpg' },
      summary: 'summary',
      meta_tags: ['TV'],
      tags: ['动画']
    }
  };
}

async function* bgmxSubjects(values: ReturnType<typeof bgmxSubject>[]) {
  yield* values;
}

beforeEach(() => {
  fetchSubject.mockReset();
  fetchCalendar.mockReset();
  fetchSubjects.mockReset();
  fetchSubjects.mockImplementation(() => bgmxSubjects([]));
});

describe('SubjectsModule telegram push enqueueing', () => {
  it('enqueues resources newly bound while inserting subjects', async () => {
    const enqueueResourceMessages = vi.fn();
    const mod = new SubjectsModule(
      {
        modules: {
          push: {
            enqueueResourceMessages
          }
        }
      } as any,
      SubjectsModule.name
    );

    vi.spyOn(mod, 'fetchSubjects').mockResolvedValue([]);
    vi.spyOn(mod, 'insertSubject')
      .mockResolvedValueOnce({
        id: 1,
        name: 'subject-1',
        matched: [
          { id: 11, title: 'resource-11' },
          { id: 12, title: 'resource-12' }
        ]
      })
      .mockResolvedValueOnce({
        id: 2,
        name: 'subject-2',
        matched: [
          { id: 12, title: 'resource-12 duplicated' },
          { id: 13, title: 'resource-13' }
        ]
      });

    const resp = await mod.insertSubjects(
      [
        {
          id: 1,
          name: 'subject-1',
          search: { include: ['subject-1'] },
          activedAt: new Date('2026-05-08T00:00:00.000Z')
        },
        {
          id: 2,
          name: 'subject-2',
          search: { include: ['subject-2'] },
          activedAt: new Date('2026-05-08T00:00:00.000Z')
        }
      ],
      {
        indexResources: true,
        pushTelegramMessage: true
      }
    );

    expect(resp.inserted).toEqual([
      { id: 1, name: 'subject-1' },
      { id: 2, name: 'subject-2' }
    ]);
    expect(enqueueResourceMessages).toHaveBeenCalledOnce();
    expect(enqueueResourceMessages).toHaveBeenCalledWith([11, 12, 13]);
  });

  it('does not enqueue indexed resources when telegram push is disabled', async () => {
    const enqueueResourceMessages = vi.fn();
    const mod = new SubjectsModule(
      {
        modules: {
          push: {
            enqueueResourceMessages
          }
        }
      } as any,
      SubjectsModule.name
    );

    vi.spyOn(mod, 'insertSubject').mockResolvedValueOnce({
      id: 1,
      name: 'subject-1',
      matched: [{ id: 11, title: 'resource-11' }]
    });

    await mod.insertSubjects(
      [
        {
          id: 1,
          name: 'subject-1',
          search: { include: ['subject-1'] },
          activedAt: new Date('2026-05-08T00:00:00.000Z')
        }
      ],
      {
        indexResources: true
      }
    );

    expect(enqueueResourceMessages).not.toHaveBeenCalled();
  });
});

describe('SubjectsModule bulk upsert', () => {
  it('writes bounded batches in one transaction', async () => {
    const batches: any[][] = [];
    let currentBatch: any[] = [];
    const returning = vi.fn(async () =>
      currentBatch.map((subject) => ({ id: subject.id, name: subject.name }))
    );
    const transaction = vi.fn(async (callback) =>
      callback({
        insert: vi.fn(() => ({
          values: vi.fn((batch: any[]) => {
            currentBatch = batch;
            batches.push(batch);
            return {
              onConflictDoUpdate: vi.fn(() => ({ returning }))
            };
          })
        }))
      })
    );
    const mod = new SubjectsModule({ database: { transaction } } as any, SubjectsModule.name);
    const subjects = Array.from({ length: 1001 }, (_, index) => ({
      id: index + 1,
      name: `subject-${index + 1}`,
      search: { include: [`subject-${index + 1}`] },
      activedAt: null,
      isArchived: index !== 0
    }));

    const result = await mod.upsertSubjects(subjects);

    expect(transaction).toHaveBeenCalledOnce();
    expect(batches.map((batch) => batch.length)).toEqual([1000, 1]);
    expect(batches[0][0]).toMatchObject({ id: 1, isArchived: false });
    expect(result).toHaveLength(1001);
  });
});

describe('SubjectsModule bgmx calendar sync', () => {
  it('upserts the full list with one final archived state per subject', async () => {
    fetchSubjects.mockImplementationOnce(() => bgmxSubjects([bgmxSubject(1), bgmxSubject(2)]));
    fetchCalendar.mockResolvedValueOnce({
      calendar: [[bgmxSubject(1)]],
      web: [bgmxSubject(4)]
    });
    const enqueueResourceMessages = vi.fn();
    const mod = {
      activeSubjects: [
        {
          id: 3,
          name: '本地旧条目',
          search: { include: ['本地旧条目'] },
          activedAt: null,
          isArchived: false
        }
      ],
      upsertSubjects: vi.fn(async () => []),
      indexSubject: vi.fn(async () => ({
        matched: [{ id: 11, title: 'resource-11' }]
      })),
      fetchSubjects: vi.fn(),
      system: {
        notifyRefreshedResources: vi.fn(),
        modules: {
          push: {
            enqueueResourceMessages
          }
        },
        logger: {
          warn: vi.fn()
        }
      }
    } as any;

    const resp = await updateCalendar(mod);

    expect(resp.inserted).toEqual([
      { id: 1, name: '中文标题' },
      { id: 4, name: '中文标题' }
    ]);
    expect(resp.archived).toEqual([{ id: 3 }]);
    expect(mod.upsertSubjects).toHaveBeenCalledOnce();
    expect(mod.upsertSubjects).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, isArchived: false }),
        expect.objectContaining({ id: 2, isArchived: true }),
        expect.objectContaining({ id: 3, isArchived: true }),
        expect.objectContaining({ id: 4, isArchived: false })
      ])
    );
    const upserted = mod.upsertSubjects.mock.calls[0][0];
    expect(upserted.filter((subject: { id: number }) => subject.id === 1)).toEqual([
      expect.objectContaining({ isArchived: false })
    ]);
    expect(mod.indexSubject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, search: { include: ['日文标题'] }, isArchived: false }),
      { overwrite: false }
    );
    expect(mod.indexSubject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, isArchived: false }),
      { overwrite: false }
    );
    expect(fetchSubjects).toHaveBeenCalledWith({ timeout: 30 * 1000, retry: 1 });
    expect(enqueueResourceMessages).toHaveBeenCalledWith([11]);
    expect(mod.fetchSubjects.mock.invocationCallOrder[0]).toBeLessThan(
      mod.indexSubject.mock.invocationCallOrder[0]
    );
    expect(mod.fetchSubjects.mock.invocationCallOrder[0]).toBeLessThan(
      enqueueResourceMessages.mock.invocationCallOrder[0]
    );
    const persisted = mod.upsertSubjects.mock.calls[0][0];
    expect(persisted.find((sub: any) => sub.id === 2)).toMatchObject({
      isArchived: true,
      metadata: { title: '日文标题', display_title: '中文标题', onair_date: '2026-07-01' }
    });
    expect(mod.system.notifyRefreshedResources).toHaveBeenCalledWith(
      expect.objectContaining({ subjects: true })
    );
  });

  it('indexes existing active subjects only when search conditions changed', async () => {
    fetchCalendar.mockResolvedValueOnce({ calendar: [[bgmxSubject(1)]], web: [] });
    const mod = {
      activeSubjects: [
        {
          id: 1,
          name: '中文标题',
          search: { include: ['日文标题'] },
          activedAt: new Date('2026-06-30T16:00:00.000Z'),
          isArchived: false
        }
      ],
      upsertSubjects: vi.fn(async () => []),
      indexSubject: vi.fn(async () => ({ matched: [] })),
      fetchSubjects: vi.fn(),
      system: {
        notifyRefreshedResources: vi.fn(),
        modules: { push: { enqueueResourceMessages: vi.fn() } },
        logger: { warn: vi.fn() }
      }
    } as any;

    await updateCalendar(mod);

    expect(mod.indexSubject).not.toHaveBeenCalled();

    fetchCalendar.mockResolvedValueOnce({
      calendar: [[bgmxSubject(1, ['日文标题', '新标题'])]],
      web: []
    });
    await updateCalendar(mod);

    expect(mod.indexSubject).toHaveBeenCalledOnce();
    expect(mod.indexSubject).toHaveBeenCalledWith(
      expect.objectContaining({ search: { include: ['日文标题', '新标题'] } }),
      { overwrite: false }
    );
  });

  it('does not reindex when only the on-air date changes', async () => {
    const original = bgmxSubject(1);
    const changedDate = {
      ...original,
      bangumi: {
        ...original.bangumi,
        date: '2026-07-02'
      }
    };
    fetchCalendar.mockResolvedValueOnce({ calendar: [[changedDate]], web: [] });
    const mod = {
      activeSubjects: [
        {
          id: 1,
          name: '中文标题',
          search: { include: ['日文标题'] },
          activedAt: new Date('2026-06-30T16:00:00.000Z'),
          isArchived: false
        }
      ],
      upsertSubjects: vi.fn(async () => []),
      indexSubject: vi.fn(async () => ({ matched: [] })),
      fetchSubjects: vi.fn(),
      system: {
        notifyRefreshedResources: vi.fn(),
        modules: { push: { enqueueResourceMessages: vi.fn() } },
        logger: { warn: vi.fn() }
      }
    } as any;

    await updateCalendar(mod);

    expect(mod.upsertSubjects).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          activedAt: new Date('2026-07-01T16:00:00.000Z'),
          isArchived: false
        })
      ])
    );
    expect(mod.indexSubject).not.toHaveBeenCalled();
  });

  it('imports subjects without an on-air date', async () => {
    const subject = bgmxSubject(1, ['日文标题'], null);
    fetchCalendar.mockResolvedValueOnce({ calendar: [[subject]], web: [] });
    const mod = {
      activeSubjects: [],
      upsertSubjects: vi.fn(async () => []),
      indexSubject: vi.fn(async () => ({ matched: [] })),
      fetchSubjects: vi.fn(),
      system: {
        notifyRefreshedResources: vi.fn(),
        modules: { push: { enqueueResourceMessages: vi.fn() } },
        logger: { warn: vi.fn() }
      }
    } as any;

    await updateCalendar(mod);

    expect(mod.upsertSubjects).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ activedAt: null, isArchived: false })])
    );
  });

  it('does not fallback when bgmx calendar fails', async () => {
    fetchCalendar.mockRejectedValueOnce(new Error('offline'));

    await expect(updateCalendar({} as any)).rejects.toThrow('offline');
  });

  it('does not fetch the calendar or write when the full subject scan fails', async () => {
    fetchSubjects.mockImplementationOnce(async function* () {
      throw new Error('subjects offline');
    });
    const mod = {
      upsertSubjects: vi.fn(),
      system: { logger: { warn: vi.fn() } }
    } as any;

    await expect(updateCalendar(mod)).rejects.toThrow('subjects offline');

    expect(fetchCalendar).not.toHaveBeenCalled();
    expect(mod.upsertSubjects).not.toHaveBeenCalled();
  });
});

describe('Subject search matching', () => {
  const search = {
    include: ['作品名', 'Work Title'],
    keywords: ['1080P', '简中'],
    exclude: ['合集', 'NCOP'],
    after: Date.parse('2026-07-01T00:00:00.000Z'),
    before: Date.parse('2026-08-01T00:00:00.000Z')
  };

  it('applies include OR, keywords AND, and exclude NOT semantics', () => {
    const createdAt = new Date('2026-07-15T00:00:00.000Z');

    expect(matchesSubjectSearch(search, '[字幕组] Work Title 1080p 简中', createdAt)).toBe(true);
    expect(matchesSubjectSearch(search, '[字幕组] 作品名 1080p', createdAt)).toBe(false);
    expect(matchesSubjectSearch(search, '[字幕组] 其他作品 1080p 简中', createdAt)).toBe(false);
    expect(matchesSubjectSearch(search, '[字幕组] 作品名 1080p 简中 合集', createdAt)).toBe(false);
  });

  it('uses inclusive after and before boundaries without an implicit date fallback', () => {
    expect(matchesSubjectSearch(search, '作品名 1080p 简中', new Date(search.after))).toBe(true);
    expect(matchesSubjectSearch(search, '作品名 1080p 简中', new Date(search.before))).toBe(true);
    expect(matchesSubjectSearch(search, '作品名 1080p 简中', new Date(search.after - 1))).toBe(
      false
    );
    expect(matchesSubjectSearch(search, '作品名 1080p 简中', new Date(search.before + 1))).toBe(
      false
    );
    expect(matchesSubjectSearch({ include: ['作品名'] }, '作品名', new Date('1990-01-01'))).toBe(
      true
    );
  });

  it('builds equivalent SQL conditions for historical indexing', () => {
    const query = new PgDialect().sqlToQuery(buildSubjectSearchSql(search)!);

    expect(query.sql).toMatchInlineSnapshot(
      `"((\"resources\".\"title_alt\" ilike $1 or \"resources\".\"title_alt\" ilike $2) and \"resources\".\"title_alt\" ilike $3 and \"resources\".\"title_alt\" ilike $4 and \"resources\".\"title_alt\" not ilike $5 and \"resources\".\"title_alt\" not ilike $6 and \"resources\".\"created_at\" >= $7 and \"resources\".\"created_at\" <= $8)"`
    );
    expect(query.params).toEqual([
      '%作品名%',
      '%work title%',
      '%1080p%',
      '%简中%',
      '%合集%',
      '%ncop%',
      new Date(search.after).toISOString(),
      new Date(search.before).toISOString()
    ]);
  });

  it('treats PostgreSQL LIKE metacharacters as literal title characters', () => {
    const specialSearch = {
      include: ['100%', 'SAC_2045', String.raw`A\B`],
      exclude: ['50%_OFF']
    };
    const query = new PgDialect().sqlToQuery(buildSubjectSearchSql(specialSearch)!);

    expect(query.params).toEqual(['%100\\%%', '%sac\\_2045%', '%a\\\\b%', '%50\\%\\_off%']);
    expect(matchesSubjectSearch(specialSearch, '作品 100% 完整版', new Date())).toBe(true);
    expect(matchesSubjectSearch(specialSearch, '作品 1000 完整版', new Date())).toBe(false);
  });
});

describe('Subject sitemap ordering', () => {
  it('sorts undated subjects after dated subjects with a stable id fallback', () => {
    const subjects = [
      { id: 2, activedAt: null },
      { id: 3, activedAt: new Date('2026-07-01T00:00:00.000Z') },
      { id: 1, activedAt: null },
      { id: 4, activedAt: new Date('2026-08-01T00:00:00.000Z') }
    ];

    expect(subjects.sort(compareSubjectsByActivedAt).map((subject) => subject.id)).toEqual([
      4, 3, 2, 1
    ]);
  });
});

/** A shared database stub lets independent processes observe the same committed records. */
function subjectDatabase(initial: any[] = []) {
  let rows = initial;
  const select = vi.fn((columns?: unknown) => ({
    from: () => {
      const snapshot = rows;
      return Object.assign(Promise.resolve(snapshot), {
        where: () => ({ limit: async () => snapshot.map((row) => ({ metadata: row.metadata })) })
      });
    }
  }));
  return {
    database: { select },
    commit: (next: any[]) => {
      rows = next;
    }
  };
}

describe('Dynamic subject metadata and cache consistency', () => {
  it('refreshes other processes on notification and polls when notifications are lost', async () => {
    vi.useFakeTimers();
    const db = subjectDatabase([]);
    const system = { database: db.database, disposables: [] as (() => void)[] };
    const mod = new SubjectsModule(system as any, SubjectsModule.name);
    try {
      await mod.initialize();
      db.commit([{ id: 700001, name: '新番', isArchived: false }]);
      await mod.refresh({ subjects: true } as any);
      expect(mod.getSubject(700001)?.name).toBe('新番');
      db.commit([{ id: 700001, name: '更新标题', isArchived: true }]);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(db.database.select).toHaveBeenCalledTimes(2);
      expect(mod.getSubject(700001)?.name).toBe('新番');
      await vi.advanceTimersByTimeAsync(9 * 60_000);
      expect(mod.getSubject(700001)?.name).toBe('更新标题');
      expect(mod.activeSubjects).toEqual([]);
      expect(mod.archivedSubjects).toHaveLength(1);
      // A failed refresh retains the last complete snapshot and the next poll recovers.
      db.database.select.mockImplementationOnce(() => {
        throw new Error('database offline');
      });
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(mod.getSubject(700001)?.name).toBe('更新标题');
      db.commit([{ id: 700001, name: '恢复', isArchived: false }]);
      await vi.advanceTimersByTimeAsync(10 * 60_000);
      expect(mod.getSubject(700001)?.name).toBe('恢复');
    } finally {
      system.disposables.forEach((dispose) => dispose());
      vi.useRealTimers();
    }
  });

  it('serializes reloads so a pre-commit query cannot overwrite a newer snapshot', async () => {
    let complete!: (rows: any[]) => void;
    const oldRead = new Promise<any[]>((resolve) => {
      complete = resolve;
    });
    const select = vi
      .fn()
      .mockReturnValueOnce({ from: () => oldRead })
      .mockReturnValueOnce({ from: async () => [{ id: 700001, name: 'new' }] });
    const mod = new SubjectsModule({ database: { select } } as any, SubjectsModule.name);
    const first = mod.fetchSubjects();
    const afterCommit = mod.fetchSubjects();
    expect(select).toHaveBeenCalledTimes(1);
    complete([{ id: 700001, name: 'old' }]);
    await Promise.all([first, afterCommit]);
    expect(mod.getSubject(700001)?.name).toBe('new');
  });

  it('reads committed historical metadata for TG and RSS despite stale process snapshots', async () => {
    const { transformBgmSubject } = await import('@animegarden/shared');
    const { generateTitleFromFilter } = await import('../src/feed/meta');
    const original = transformBgmSubject(bgmxSubject(700001) as any);
    const db = subjectDatabase([{ id: original.id, metadata: original, isArchived: false }]);
    const first = new SubjectsModule({ database: db.database } as any, SubjectsModule.name);
    const second = new SubjectsModule({ database: db.database } as any, SubjectsModule.name);
    await Promise.all([first.fetchSubjects(), second.fetchSubjects()]);
    const next = { ...original, display_title: '换季后的历史标题', title: 'Updated' };
    db.commit([{ id: original.id, metadata: next, isArchived: true }]);
    expect(first.getSubject(700001)?.metadata).toEqual(original);
    await expect(first.getSubjectMetadata(700001)).resolves.toEqual(next);
    await expect(second.getSubjectMetadata(700001)).resolves.toEqual(next);
    await expect(generateTitleFromFilter({ subjects: [700001] }, second)).resolves.toBe(
      '换季后的历史标题 最新动画资源'
    );
    expect(fetchSubject).not.toHaveBeenCalled();
  });

  it('resolves legacy metadata dynamically and distinguishes missing subjects from outages', async () => {
    const db = subjectDatabase([{ id: 700001, metadata: null }]);
    const mod = new SubjectsModule({ database: db.database } as any, SubjectsModule.name);
    fetchSubject.mockResolvedValueOnce({ subject: bgmxSubject(700001) });
    await expect(mod.getSubjectMetadata(700001)).resolves.toMatchObject({
      id: 700001,
      title: '日文标题',
      display_title: '中文标题',
      onair_date: '2026-07-01'
    });
    fetchSubject.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(mod.getSubjectMetadata(700001)).resolves.toBeUndefined();
    fetchSubject.mockRejectedValueOnce(new Error('upstream offline'));
    await expect(mod.getSubjectMetadata(700001)).rejects.toThrow('upstream offline');
    db.database.select.mockImplementationOnce(() => {
      throw new Error('database offline');
    });
    await expect(mod.getSubjectMetadata(700001)).rejects.toThrow('database offline');
    expect(fetchSubject).toHaveBeenCalledTimes(3);
  });
});
