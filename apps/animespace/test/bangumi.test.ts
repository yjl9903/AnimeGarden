import path from 'node:path';
import { access, readFile } from 'node:fs/promises';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

import {
  importBangumiCollection,
  resolveCollectionType,
  searchBangumi
} from '../src/command/bangumi.ts';
import { createCollectionItem, resolveYearMonth } from '../src/bangumi/transform.ts';
import { RawCollectionSchema, RawSubjectSchema } from '../src/subject/schema.ts';
import { createAnimeSpaceTestKit } from './helpers/animespace.ts';

const kit = createAnimeSpaceTestKit();

afterEach(async () => {
  vi.restoreAllMocks();
  await kit.cleanup();
});

function createSubjectDetail(
  id: number,
  options: {
    name?: string;
    nameCn?: string;
    date?: string;
    infobox?: unknown[];
  } = {}
) {
  return {
    id,
    type: 2,
    name: options.name ?? `Title-${id}`,
    name_cn: options.nameCn ?? `中文标题-${id}`,
    summary: '',
    series: false,
    nsfw: false,
    locked: false,
    date: options.date ?? '2025-04-01',
    platform: 'TV',
    images: {},
    infobox: options.infobox ?? [],
    volumes: 0,
    eps: 0,
    total_episodes: 0,
    rating: {
      rank: 0,
      total: 0,
      count: {},
      score: 0
    },
    collection: {
      wish: 0,
      collect: 0,
      doing: 0,
      on_hold: 0,
      dropped: 0
    },
    meta_tags: [],
    tags: []
  } as any;
}

describe('bangumi command helpers', () => {
  it('creates collection item from bangumi subject aliases', () => {
    const item = createCollectionItem(
      createSubjectDetail(123, {
        name: 'Original',
        nameCn: '中文名',
        infobox: [
          { key: '简体中文名', value: '中文别名' },
          {
            key: '别名',
            value: [{ v: 'Alias-1' }, { k: '英文名', v: 'Alias-2' }, { v: 'Original' }]
          }
        ]
      })
    );

    expect(item).toEqual({
      name: '中文名',
      bgm: 123,
      source: {
        include: ['中文名', 'Original', '中文别名', 'Alias-1', 'Alias-2']
      }
    });
    expect(RawSubjectSchema.parse(item)).toBeTruthy();
  });

  it('adds naming when trimSeason removes season suffix', () => {
    const item = createCollectionItem(
      createSubjectDetail(456, {
        name: 'Frieren 2nd Season',
        nameCn: '葬送的芙莉莲 第二季'
      })
    );

    expect(item).toEqual({
      name: '葬送的芙莉莲 第二季',
      bgm: 456,
      naming: '葬送的芙莉莲',
      source: {
        include: ['葬送的芙莉莲 第二季', 'Frieren 2nd Season']
      }
    });
    expect(RawSubjectSchema.parse(item)).toBeTruthy();
  });

  it('parses collection status with doing as default', () => {
    expect(resolveCollectionType()).toBe(3);
    expect(resolveCollectionType('doing')).toBe(3);
    expect(resolveCollectionType('在看')).toBe(3);
    expect(resolveCollectionType('wish')).toBe(1);
    expect(resolveCollectionType('collect')).toBe(2);
    expect(resolveCollectionType('on_hold')).toBe(4);
    expect(resolveCollectionType('dropped')).toBe(5);
  });

  it('rolls filename year-month into next month for the last 7 days', () => {
    expect(resolveYearMonth('2026-03-25', undefined, new Date('2026-01-01T00:00:00.000Z'))).toBe(
      '2026-04'
    );
    expect(resolveYearMonth('2026-03-31', undefined, new Date('2026-01-01T00:00:00.000Z'))).toBe(
      '2026-04'
    );
    expect(resolveYearMonth('2026-03-23', undefined, new Date('2026-01-01T00:00:00.000Z'))).toBe(
      '2026-03'
    );
    expect(resolveYearMonth(undefined, '2026-02-24', new Date('2026-01-01T00:00:00.000Z'))).toBe(
      '2026-03'
    );
  });
});

describe('bangumi search', () => {
  it('returns single search result directly', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      searchSubjects: vi.fn().mockResolvedValue({
        total: 1,
        limit: 20,
        offset: 0,
        data: [{ id: 1, name: 'Origin-1', name_cn: '条目一', date: '2025-04-01' }]
      }),
      subject: vi
        .fn()
        .mockResolvedValue(createSubjectDetail(1, { name: 'Origin-1', nameCn: '条目一' }))
    } as any;

    const item = await searchBangumi(system, 'demo', {}, { client });

    expect(item.name).toBe('条目一');
    expect(item.bgm).toBe(1);
    expect(client.subject).toHaveBeenCalledWith(1);
    expect(RawSubjectSchema.parse(item)).toBeTruthy();
  });

  it('selects among multiple search results in interactive mode', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      searchSubjects: vi.fn().mockResolvedValue({
        total: 2,
        limit: 20,
        offset: 0,
        data: [
          { id: 1, name: 'Origin-1', name_cn: '条目一', date: '2025-04-01' },
          { id: 2, name: 'Origin-2', name_cn: '条目二', date: '2025-04-02' }
        ]
      }),
      subject: vi.fn().mockImplementation(async (id: number) =>
        createSubjectDetail(id, {
          name: `Origin-${id}`,
          nameCn: id === 1 ? '条目一' : '条目二'
        })
      )
    } as any;

    const item = await searchBangumi(
      system,
      'demo',
      {},
      {
        client,
        isTTY: true,
        selectSubjectIndex: async () => 1
      }
    );

    expect(item.bgm).toBe(2);
    expect(item.name).toBe('条目二');
    expect(client.subject).toHaveBeenCalledWith(2);
  });

  it('rejects multi-result search in non-interactive mode', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      searchSubjects: vi.fn().mockResolvedValue({
        total: 2,
        limit: 20,
        offset: 0,
        data: [
          { id: 1, name: 'Origin-1', name_cn: '条目一', date: '2025-04-01' },
          { id: 2, name: 'Origin-2', name_cn: '条目二', date: '2025-04-02' }
        ]
      }),
      subject: vi.fn()
    } as any;

    await expect(searchBangumi(system, 'demo', {}, { client, isTTY: false })).rejects.toThrow(
      'bangumi search 仅支持交互选择。'
    );
    expect(client.subject).not.toHaveBeenCalled();
  });
});

describe('bangumi collection', () => {
  it('uses bangumi.uid from anime.yaml, defaults to doing, and filters collections by date', async () => {
    const system = await kit.createSystem({
      yaml: `
bangumi:
  uid: 123456
collections: []
`
    });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      getCollections: vi
        .fn()
        .mockResolvedValueOnce({
          total: 3,
          limit: 100,
          offset: 0,
          data: [
            { subject_id: 1, subject: { date: '2025-04-01' } },
            { subject_id: 2, subject: { date: '2025-05-01' } },
            { subject_id: 3, subject: undefined }
          ]
        })
        .mockResolvedValueOnce({
          total: 3,
          limit: 100,
          offset: 2,
          data: [{ subject_id: 4, subject: { date: undefined } }]
        })
        .mockResolvedValueOnce({
          total: 3,
          limit: 100,
          offset: 3,
          data: []
        }),
      subject: vi
        .fn()
        .mockResolvedValue(createSubjectDetail(1, { name: 'Origin-1', nameCn: '条目一' }))
    } as any;

    const result = await importBangumiCollection(
      system,
      {
        after: '2025-04-01',
        before: '2025-04-30'
      },
      {
        client,
        now: new Date('2026-04-03T23:02:25+08:00')
      }
    );

    expect(result.uid).toBe('123456');
    expect(result.collection).toEqual({
      name: '2025 年 4 月新番放送计划',
      enabled: true,
      preference: {
        animegarden: {
          after: '2025-04-01T00:00:00.000Z',
          before: '2025-04-30T00:00:00.000Z'
        }
      },
      subjects: [
        {
          name: '条目一',
          bgm: 1,
          source: {
            include: ['条目一', 'Origin-1']
          }
        }
      ]
    });
    expect(client.getCollections).toHaveBeenCalledWith('123456', {
      subject_type: 2,
      type: 3,
      limit: 100,
      offset: 0
    });
    expect(client.subject).toHaveBeenCalledTimes(1);
    expect(RawCollectionSchema.parse(result.collection)).toBeTruthy();
    await expect(
      access(path.join(system.space.root.path, 'collections', '2025-04.yaml'))
    ).rejects.toThrow();
  });

  it('fails when uid is missing from both cli option and anime.yaml', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    await expect(importBangumiCollection(system, {}, { client: {} as any })).rejects.toThrow(
      '缺少 Bangumi UID'
    );
  });

  it('writes default dump file when --dump is enabled', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      getCollections: vi.fn().mockResolvedValue({
        total: 1,
        limit: 100,
        offset: 0,
        data: [{ subject_id: 1, subject: { date: '2025-04-01' } }]
      }),
      subject: vi
        .fn()
        .mockResolvedValue(createSubjectDetail(1, { name: 'Origin-1', nameCn: '条目一' }))
    } as any;

    const result = await importBangumiCollection(
      system,
      {
        uid: '42',
        after: '2025-04-01',
        dump: true,
        json: true
      },
      {
        client,
        now: new Date('2026-04-03T23:02:25+08:00')
      }
    );

    expect(result.dumpPath).toBe(path.join(system.space.root.path, 'collections', '2025-04.yaml'));

    const content = await readFile(result.dumpPath!, 'utf8');
    expect(content.startsWith('name: 2025 年 4 月新番放送计划')).toBe(true);
    expect(RawCollectionSchema.parse(parse(content))).toBeTruthy();
  });

  it('suppresses dump banner when --json output is enabled', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    const loggerLog = vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      getCollections: vi.fn().mockResolvedValue({
        total: 1,
        limit: 100,
        offset: 0,
        data: [{ subject_id: 1, subject: { date: '2025-04-01' } }]
      }),
      subject: vi
        .fn()
        .mockResolvedValue(createSubjectDetail(1, { name: 'Origin-1', nameCn: '条目一' }))
    } as any;

    await importBangumiCollection(
      system,
      {
        uid: '42',
        after: '2025-04-01',
        dump: true,
        json: true
      },
      {
        client,
        now: new Date('2026-04-03T23:02:25+08:00')
      }
    );

    const output = loggerLog.mock.calls.map(([value]) => String(value ?? ''));
    expect(output).toHaveLength(1);
    expect(() => JSON.parse(output[0]!)).not.toThrow();
  });

  it('writes custom relative dump file and refuses to overwrite existing files', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      getCollections: vi.fn().mockResolvedValue({
        total: 0,
        limit: 100,
        offset: 0,
        data: []
      }),
      subject: vi.fn()
    } as any;

    const first = await importBangumiCollection(
      system,
      {
        uid: '42',
        dump: 'collections/custom.yaml'
      },
      {
        client,
        now: new Date('2026-04-03T23:02:25+08:00')
      }
    );

    expect(first.dumpPath).toBe(path.join(system.space.root.path, 'collections', 'custom.yaml'));
    await expect(
      importBangumiCollection(
        system,
        {
          uid: '42',
          dump: 'collections/custom.yaml'
        },
        {
          client,
          now: new Date('2026-04-03T23:02:25+08:00')
        }
      )
    ).rejects.toThrow('目标文件已存在');
  });

  it('prefers cli uid over anime.yaml config', async () => {
    const system = await kit.createSystem({
      yaml: `
bangumi:
  uid: 111
collections: []
`
    });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      getCollections: vi.fn().mockResolvedValue({
        total: 0,
        limit: 100,
        offset: 0,
        data: []
      }),
      subject: vi.fn()
    } as any;

    await importBangumiCollection(system, { uid: '222' }, { client });

    expect(client.getCollections).toHaveBeenCalledWith('222', {
      subject_type: 2,
      type: 3,
      limit: 100,
      offset: 0
    });
  });

  it('uses explicit status option when provided', async () => {
    const system = await kit.createSystem({ yaml: 'collections: []\n' });
    vi.spyOn(system.logger, 'log').mockImplementation(() => undefined as any);

    const client = {
      getCollections: vi.fn().mockResolvedValue({
        total: 0,
        limit: 100,
        offset: 0,
        data: []
      }),
      subject: vi.fn()
    } as any;

    await importBangumiCollection(system, { uid: '222', status: 'wish' }, { client });

    expect(client.getCollections).toHaveBeenCalledWith('222', {
      subject_type: 2,
      type: 1,
      limit: 100,
      offset: 0
    });
  });
});
