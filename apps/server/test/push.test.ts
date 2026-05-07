import fs from 'node:fs';
import path from 'node:path';

import { parse } from 'anipar';
import { describe, expect, it, vi } from 'vitest';

import type { BasicSubject } from 'bgmd';
import type { FoundResource } from '../src/resources/query';
import {
  buildResourceCardMessage,
  normalizeParsedEpisode,
  PushContext,
  PushModule,
  TelegramMessageStatus
} from '../src/push';

function readAniparTitles(asset: string) {
  return fs
    .readFileSync(
      path.join(import.meta.dirname, `../../../packages/anipar/test/__assets__/${asset}.csv`),
      'utf-8'
    )
    .split('\n')
    .map((title) => title.trim())
    .map((title) => (title.startsWith('"') && title.endsWith('"') ? title.slice(1, -1) : title))
    .filter(Boolean);
}

function createResource(title: string): FoundResource {
  return {
    id: 1,
    provider: 'dmhy',
    providerId: '12345',
    title,
    href: '12345',
    type: '动画',
    magnet: 'magnet:?xt=urn:btih:0123456789012345678901234567890123456789',
    tracker: '&tr=https%3A%2F%2Ftracker.example.com%2Fannounce',
    size: 511160,
    createdAt: '2026-05-07T05:00:00.000Z',
    fetchedAt: '2026-05-07T05:00:00.000Z',
    publisher: {
      id: 1,
      name: 'Kirara Fantasia'
    },
    fansub: {
      id: 1,
      name: 'Kirara Fantasia'
    },
    metadata: null
  };
}

function createPushResource(
  options: Partial<FoundResource> & {
    title?: string;
    id?: number;
    fansub?: FoundResource['fansub'] | null;
  } = {}
): FoundResource {
  return {
    ...createResource(options.title ?? readAniparTitles('ani')[0]),
    id: options.id ?? 1,
    provider: options.provider ?? 'dmhy',
    providerId: options.providerId ?? String(options.id ?? 1),
    publisher: options.publisher ?? {
      id: 1,
      name: 'ANi'
    },
    fansub:
      options.fansub === null
        ? undefined
        : options.fansub === undefined
          ? {
              id: 1,
              name: 'ANi'
            }
          : options.fansub,
    subjectId: options.subjectId ?? 615739,
    createdAt: options.createdAt ?? '2026-05-07T05:00:00.000Z',
    metadata: options.metadata ?? null
  };
}

type FakeTelegramMessage = {
  id: number;
  resourceId: number;
  publisherId: number;
  fansubId: number | null;
  subjectId: number;
  episode: string;
  telegramChatId: number | null;
  telegramMessageId: number | null;
  status: TelegramMessageStatus;
  sentAt: Date | null;
  editedAt: Date | null;
  updatedAt: Date;
};

function createTelegramDatabase(initial: Partial<FakeTelegramMessage>[] = []) {
  const records: FakeTelegramMessage[] = initial.map((record, index) => ({
    id: record.id ?? index + 1,
    resourceId: record.resourceId ?? 1,
    publisherId: record.publisherId ?? 1,
    fansubId: record.fansubId === undefined ? 1 : record.fansubId,
    subjectId: record.subjectId ?? 615739,
    episode: record.episode ?? 'episode:1',
    telegramChatId: record.telegramChatId ?? null,
    telegramMessageId: record.telegramMessageId ?? null,
    status: record.status ?? TelegramMessageStatus.Sent,
    sentAt: record.sentAt ?? null,
    editedAt: record.editedAt ?? null,
    updatedAt: record.updatedAt ?? new Date('2026-05-07T05:00:00.000Z')
  }));
  let nextId = records.length + 1;

  const whereResult = (targetRecords: FakeTelegramMessage[]) => ({
    returning: async () => targetRecords,
    then: (
      resolve: (value: FakeTelegramMessage[]) => unknown,
      reject: (reason: unknown) => unknown
    ) => Promise.resolve(targetRecords).then(resolve, reject)
  });

  const database = {
    selectDistinct: vi.fn(() => ({
      from: () => ({
        where: async () =>
          records
            .filter((record) => record.status === TelegramMessageStatus.Failed)
            .map((record) => ({ resourceId: record.resourceId }))
      })
    })),
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async () => records.slice(0, 1)
        })
      })
    })),
    insert: vi.fn(() => ({
      values: (value: Omit<FakeTelegramMessage, 'id'>) => ({
        returning: async () => {
          const record = {
            ...value,
            id: nextId++,
            telegramChatId: value.telegramChatId ?? null,
            telegramMessageId: value.telegramMessageId ?? null,
            sentAt: value.sentAt ?? null,
            editedAt: value.editedAt ?? null
          } as FakeTelegramMessage;
          records.push(record);
          return [record];
        }
      })
    })),
    update: vi.fn(() => ({
      set: (value: Partial<FakeTelegramMessage>) => ({
        where: () => {
          const targetRecords =
            value.status === TelegramMessageStatus.Failed
              ? records.filter(
                  (record) =>
                    record.status === TelegramMessageStatus.Pending ||
                    record.status === TelegramMessageStatus.Sending
                )
              : records[0]
                ? [records[0]]
                : [];

          for (const record of targetRecords) {
            Object.assign(record, value);
          }

          return whereResult(targetRecords);
        }
      })
    }))
  };

  return { database, records };
}

function createResourceLookupDatabase(rows: Array<{ id: number }>) {
  return {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: async (count: number) => rows.slice(0, count),
          then: (
            resolve: (value: Array<{ id: number }>) => unknown,
            reject: (reason: unknown) => unknown
          ) => Promise.resolve(rows).then(resolve, reject)
        })
      })
    }))
  };
}

function createPushModule(options: {
  resources?: FoundResource[];
  database?: ReturnType<typeof createTelegramDatabase>['database'];
  api?: Record<string, any>;
}) {
  const resources = options.resources ?? [createPushResource()];
  const getResourcesByIds = vi.fn(async (...ids: number[]) =>
    ids.flatMap((id) => resources.find((resource) => resource.id === id) ?? [])
  );
  const db = options.database ?? createTelegramDatabase().database;
  const mod = new PushModule(
    {
      database: db,
      options: {
        site: 'example.com',
        telegram: {
          chatId: '@animegarden_test'
        }
      },
      modules: {
        resources: {
          getResourcesByIds
        }
      }
    } as any,
    PushModule.name
  );
  (mod.system.modules as any).push = mod;
  mod.bot = {
    api: options.api ?? {
      sendPhoto: vi.fn().mockResolvedValue({ message_id: 100 })
    }
  } as any;

  return { mod, getResourcesByIds };
}

function createPreparedPushContext(
  resource: FoundResource,
  parsed: Parameters<PushContext['compare']>[0]['parsed']
) {
  const context = new PushContext({ modules: { push: { logger: {} } } } as any, resource);
  context.publisher = resource.publisher;
  // TODO: NonNull for now
  // @ts-expect-error
  context.fansub = resource.fansub;
  context.parsed = parsed;
  return context;
}

const subject: BasicSubject = {
  id: 1,
  title: '從前從前有隻貓！世界喵童話',
  platform: 'TV',
  onair_date: '2025-10-01',
  rating: {
    score: 0,
    rank: 0
  },
  poster: 'https://example.com/poster.jpg',
  tags: [],
  search: {
    include: []
  }
};

describe('telegram resource card', () => {
  it('builds a card message from anipar title fixtures', () => {
    const title = readAniparTitles('kirara_fantasia').find((title) =>
      title.includes('(Baha 1920x1080 AVC AAC MP4)')
    )!;
    const parsed = parse(title, { fansub: 'Kirara Fantasia' })!;
    parsed.subtitle = {
      languages: ['繁'],
      format: '内封'
    };

    const message = buildResourceCardMessage(createResource(title), subject, parsed, {
      site: 'animes.garden'
    });

    expect(message.text).toContain('#從前從前有隻貓世界喵童話 #2025年10月');
    expect(message.text).toContain('<b>從前從前有隻貓！世界喵童話 · 第 1 集</b>');
    expect(message.text).toContain('#KiraraFantasia');
    expect(message.text).toContain('<b>字幕:</b> 繁中 · 内封字幕');
    expect(message.text).toContain('<b>格式:</b> 1080p · AVC · mp4 · AAC');
    expect(message.text).toContain('499.18 MB');
    expect(message.text).toContain('<b>发布:</b> 2026 年 5 月 7 日 13:00');
    expect(message.text).toContain('<b>追踪:</b> #KiraraFantasia_從前從前有隻貓世界喵童話');
    expect(message.text).not.toContain('磁力链接');
    expect(message.text).toContain(
      '<a href="https://animes.garden/detail/dmhy/12345">查看详情</a> · <a href="https://keepshare.org/gv78k1oi/magnet%3A%3Fxt%3Durn%3Abtih%3A0123456789012345678901234567890123456789">在线播放</a>'
    );
    expect(message.photo).toBe('https://example.com/poster.jpg');
    expect(message.options.parse_mode).toBe('HTML');
    expect('link_preview_options' in message.options).toBe(false);
  });

  it('sends card messages through grammy', async () => {
    const resource = createPushResource();
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 123 });
    const { records, database } = createTelegramDatabase();
    const { mod, getResourcesByIds } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(1);

    expect(getResourcesByIds).toHaveBeenCalledWith(1);
    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendPhoto.mock.calls[0][0]).toBe('@animegarden_test');
    expect(sendPhoto.mock.calls[0][1]).toBeTruthy();
    expect(sendPhoto.mock.calls[0][2]).toMatchObject({
      parse_mode: 'HTML',
      caption: expect.stringContaining('查看详情')
    });
    expect('link_preview_options' in sendPhoto.mock.calls[0][2]).toBe(false);
    expect(records[0]).toMatchObject({
      resourceId: 1,
      publisherId: 1,
      fansubId: 1,
      status: TelegramMessageStatus.Sent,
      telegramMessageId: 123
    });
    expect(records[0].sentAt).toBeInstanceOf(Date);
  });

  // TODO: skip for now
  it.skip('uses the publisher name when the resource has no fansub', async () => {
    const resource = createPushResource({ fansub: null });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 124 });
    const { records, database } = createTelegramDatabase();
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(1);

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(records[0]).toMatchObject({
      resourceId: 1,
      publisherId: 1,
      fansubId: null,
      status: TelegramMessageStatus.Sent,
      telegramMessageId: 124
    });
  });

  it('marks the telegram message failed when sending photo fails', async () => {
    const resource = createPushResource();
    const sendPhoto = vi.fn().mockRejectedValue(new Error('photo failed'));
    const { records, database } = createTelegramDatabase();
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });
    vi.spyOn(mod.logger, 'warn').mockImplementation(() => {});

    await expect(mod.pushResourceMessage(1)).rejects.toThrow('photo failed');

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(records[0]).toMatchObject({
      resourceId: 1,
      status: TelegramMessageStatus.Failed
    });
  });

  it('normalizes episode keys', () => {
    expect(
      normalizeParsedEpisode({
        title: 'test',
        episode: {
          number: 12,
          numberSub: 5
        }
      })
    ).toBe('episode:12.5');
    expect(
      normalizeParsedEpisode({
        title: 'test',
        episodesRange: {
          from: 1,
          to: 12
        }
      })
    ).toBe('episodes_range:1-12');
    expect(
      normalizeParsedEpisode({
        title: 'test',
        episodes: [{ number: 1 }, { number: 2 }, { number: 3 }]
      })
    ).toBe('episodes:1-2-3');
  });

  it('compares message priority by version, language, provider, and created time', () => {
    const base = createPushResource();
    expect(
      createPreparedPushContext(base, {
        title: 'test',
        episode: { number: 1 },
        version: 2
      }).compare(
        createPreparedPushContext(base, {
          title: 'test',
          episode: { number: 1 },
          version: 1
        })
      )
    ).toBeGreaterThan(0);
    expect(
      createPreparedPushContext(base, {
        title: 'test',
        episode: { number: 1 },
        subtitle: { languages: ['简'] }
      }).compare(
        createPreparedPushContext(base, {
          title: 'test',
          episode: { number: 1 },
          subtitle: { languages: ['繁'] }
        })
      )
    ).toBeGreaterThan(0);
    expect(
      createPreparedPushContext(createPushResource({ provider: 'dmhy' }), {
        title: 'test',
        episode: { number: 1 }
      }).compare(
        createPreparedPushContext(createPushResource({ provider: 'ani' }), {
          title: 'test',
          episode: { number: 1 }
        })
      )
    ).toBeGreaterThan(0);
    expect(
      createPreparedPushContext(createPushResource({ createdAt: '2026-05-07T06:00:00.000Z' }), {
        title: 'test',
        episode: { number: 1 }
      }).compare(
        createPreparedPushContext(createPushResource({ createdAt: '2026-05-07T05:00:00.000Z' }), {
          title: 'test',
          episode: { number: 1 }
        })
      )
    ).toBeGreaterThan(0);
  });

  it('skips resources outside the fansub allowlist', async () => {
    const resource = createPushResource({
      fansub: {
        id: 1,
        name: 'Kirara Fantasia'
      }
    });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 123 });
    const { records, database } = createTelegramDatabase();
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(1);

    expect(sendPhoto).not.toHaveBeenCalled();
    expect(records).toHaveLength(0);
  });

  it('skips messages already in sending status', async () => {
    const resource = createPushResource();
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 123 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Sending
      }
    ]);
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(1);

    expect(sendPhoto).not.toHaveBeenCalled();
    expect(records[0].status).toBe(TelegramMessageStatus.Sending);
  });

  it('skips messages already in pending status', async () => {
    const resource = createPushResource();
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 123 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Pending
      }
    ]);
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(1);

    expect(sendPhoto).not.toHaveBeenCalled();
    expect(records[0].status).toBe(TelegramMessageStatus.Pending);
  });

  it('lets a higher priority resource take over a pending message', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      provider: 'ani'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      provider: 'dmhy'
    });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 128 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Pending
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(2);

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendPhoto.mock.calls[0][2].caption).toContain('/detail/dmhy/current');
    expect(records[0]).toMatchObject({
      resourceId: 2,
      status: TelegramMessageStatus.Sent,
      telegramMessageId: 128
    });
  });

  it('keeps a higher priority pending message when a lower priority resource arrives', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      provider: 'dmhy'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      provider: 'ani'
    });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 129 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Pending
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(2);

    expect(sendPhoto).not.toHaveBeenCalled();
    expect(records[0]).toMatchObject({
      resourceId: 1,
      status: TelegramMessageStatus.Pending
    });
  });

  it('uses the previous failed resource when it has higher priority', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      provider: 'dmhy'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      provider: 'ani'
    });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 125 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Failed
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(2);

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendPhoto.mock.calls[0][2].caption).toContain('/detail/dmhy/previous');
    expect(records[0]).toMatchObject({
      resourceId: 1,
      status: TelegramMessageStatus.Sent,
      telegramMessageId: 125
    });
  });

  it('uses the current failed resource when it has higher priority', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      provider: 'ani'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      provider: 'dmhy'
    });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 126 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Failed
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { sendPhoto }
    });

    await mod.pushResourceMessage(2);

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendPhoto.mock.calls[0][2].caption).toContain('/detail/dmhy/current');
    expect(records[0]).toMatchObject({
      resourceId: 2,
      publisherId: 1,
      fansubId: 1,
      status: TelegramMessageStatus.Sent,
      telegramMessageId: 126
    });
  });

  it('edits sent messages when the new resource has higher priority', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      createdAt: '2026-05-07T05:00:00.000Z'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      createdAt: '2026-05-07T06:00:00.000Z'
    });
    const editMessageCaption = vi.fn().mockResolvedValue({ message_id: 126 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Sent,
        telegramChatId: 1000,
        telegramMessageId: 99
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { editMessageCaption }
    });

    await mod.pushResourceMessage(2);

    expect(editMessageCaption).toHaveBeenCalledOnce();
    expect(editMessageCaption.mock.calls[0][1]).toBe(99);
    expect(editMessageCaption.mock.calls[0][2]).toMatchObject({
      caption: expect.stringContaining('/detail/dmhy/current')
    });
    expect(records[0]).toMatchObject({
      resourceId: 2,
      status: TelegramMessageStatus.Sent
    });
    expect(records[0].editedAt).toBeInstanceOf(Date);
  });

  it('edits pending messages with telegram ids when the new resource has higher priority', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      createdAt: '2026-05-07T05:00:00.000Z'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      createdAt: '2026-05-07T06:00:00.000Z'
    });
    const editMessageCaption = vi.fn().mockResolvedValue({ message_id: 130 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Sending,
        telegramChatId: 1000,
        telegramMessageId: 99
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { editMessageCaption }
    });

    await mod.pushResourceMessage(2);

    expect(editMessageCaption).toHaveBeenCalledOnce();
    expect(editMessageCaption.mock.calls[0][1]).toBe(99);
    expect(editMessageCaption.mock.calls[0][2]).toMatchObject({
      caption: expect.stringContaining('/detail/dmhy/current')
    });
    expect(records[0]).toMatchObject({
      resourceId: 2,
      status: TelegramMessageStatus.Sent
    });
  });

  it('skips editing sent messages when the new resource has lower priority', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      provider: 'dmhy'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      provider: 'ani'
    });
    const editMessageCaption = vi.fn().mockResolvedValue({ message_id: 127 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Sent,
        telegramChatId: 1000,
        telegramMessageId: 99
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { editMessageCaption }
    });

    await mod.pushResourceMessage(2);

    expect(editMessageCaption).not.toHaveBeenCalled();
    expect(records[0]).toMatchObject({
      resourceId: 1,
      status: TelegramMessageStatus.Sent,
      telegramMessageId: 99
    });
  });

  it('deduplicates pending queued resource ids', async () => {
    const { mod } = createPushModule({});
    const pushResourceMessage = vi
      .spyOn(mod, 'pushResourceMessage')
      .mockImplementation(async () => {});

    mod.enqueueResourceMessages([1, 1, 1]);

    expect(pushResourceMessage).toHaveBeenCalledOnce();
    expect(pushResourceMessage).toHaveBeenCalledWith(1);
  });

  it('does not serialize resource push prework in enqueueResourceMessages', async () => {
    let releaseFirst!: () => void;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const { mod } = createPushModule({});
    const started: number[] = [];

    vi.spyOn(mod, 'pushResourceMessage').mockImplementation(async (id: number) => {
      started.push(id);
      if (id === 1) await first;
    });

    mod.enqueueResourceMessages([1, 2]);

    expect(started).toEqual([1, 2]);

    releaseFirst();
  });

  it('marks stale pending and sending messages failed before retrying them', async () => {
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Failed
      },
      {
        resourceId: 2,
        status: TelegramMessageStatus.Pending
      },
      {
        resourceId: 3,
        status: TelegramMessageStatus.Sending
      }
    ]);
    const { mod } = createPushModule({ database });
    const enqueueResourceMessages = vi
      .spyOn(mod, 'enqueueResourceMessages')
      .mockImplementation(() => {});

    const ids = await mod.enqueueFailedResourceMessages();

    expect(ids).toEqual([1, 2, 3]);
    expect(records[1].status).toBe(TelegramMessageStatus.Failed);
    expect(records[2].status).toBe(TelegramMessageStatus.Failed);
    expect(enqueueResourceMessages).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('does not call telegram when sending lock is lost before the API call', async () => {
    const resource = createPushResource();
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 131 });
    const { database } = createTelegramDatabase();
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto }
    });
    vi.spyOn(mod, 'markTelegramMessageSending').mockResolvedValueOnce(undefined as any);

    await mod.pushResourceMessage(1);

    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it('deletes a newly sent stale message when sent marking loses the lock', async () => {
    const resource = createPushResource();
    const sendPhoto = vi.fn().mockResolvedValue({
      chat: { id: 1000 },
      message_id: 132
    });
    const deleteMessage = vi.fn().mockResolvedValue(true);
    const { database } = createTelegramDatabase();
    const { mod } = createPushModule({
      resources: [resource],
      database,
      api: { sendPhoto, deleteMessage }
    });
    vi.spyOn(mod, 'markTelegramMessageSent').mockResolvedValueOnce(undefined as any);

    await mod.pushResourceMessage(1);

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(deleteMessage).toHaveBeenCalledWith(1000, 132);
  });

  it('does not delete an edited stale message when sent marking loses the lock', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      createdAt: '2026-05-07T05:00:00.000Z'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      createdAt: '2026-05-07T06:00:00.000Z'
    });
    const editMessageCaption = vi.fn().mockResolvedValue({ message_id: 99 });
    const deleteMessage = vi.fn().mockResolvedValue(true);
    const { database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Sending,
        telegramChatId: 1000,
        telegramMessageId: 99
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current],
      database,
      api: { editMessageCaption, deleteMessage }
    });
    vi.spyOn(mod, 'markTelegramMessageSent').mockResolvedValueOnce(undefined as any);

    await mod.pushResourceMessage(2);

    expect(editMessageCaption).toHaveBeenCalledOnce();
    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it('rereads and compares again when pending takeover loses the lock', async () => {
    const previous = createPushResource({
      id: 1,
      providerId: 'previous',
      provider: 'ani'
    });
    const current = createPushResource({
      id: 2,
      providerId: 'current',
      provider: 'moe'
    });
    const winner = createPushResource({
      id: 3,
      providerId: 'winner',
      provider: 'dmhy'
    });
    const sendPhoto = vi.fn().mockResolvedValue({ message_id: 133 });
    const { records, database } = createTelegramDatabase([
      {
        resourceId: 1,
        status: TelegramMessageStatus.Pending
      }
    ]);
    const { mod } = createPushModule({
      resources: [previous, current, winner],
      database,
      api: { sendPhoto }
    });
    vi.spyOn(mod, 'markTelegramMessagePending').mockImplementationOnce(async () => {
      records[0].resourceId = 3;
      return undefined as any;
    });

    await mod.pushResourceMessage(2);

    expect(sendPhoto).not.toHaveBeenCalled();
    expect(records[0]).toMatchObject({
      resourceId: 3,
      status: TelegramMessageStatus.Pending
    });
  });

  it('serializes telegram API calls', async () => {
    let releaseFirst!: (value: { message_id: number }) => void;
    const first = new Promise<{ message_id: number }>((resolve) => {
      releaseFirst = resolve;
    });
    const sendPhoto = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce({ message_id: 2 });
    const { mod } = createPushModule({
      database: createTelegramDatabase([
        { id: 1, status: TelegramMessageStatus.Pending },
        { id: 2, status: TelegramMessageStatus.Pending }
      ]).database,
      api: { sendPhoto }
    });
    const message = {
      photo: 'https://example.com/poster.jpg',
      text: 'caption',
      options: {
        parse_mode: 'HTML' as const
      }
    };

    const firstSent = mod.sendResourceMessage(1, 1, message);
    const secondSent = mod.sendResourceMessage(2, 2, message);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendPhoto).toHaveBeenCalledOnce();

    releaseFirst({ message_id: 1 });
    await firstSent;
    await secondSent;

    expect(sendPhoto).toHaveBeenCalledTimes(2);
  });

  it('pushes a manually specified provider resource', async () => {
    const database = createResourceLookupDatabase([{ id: 11 }]);
    const { mod } = createPushModule({ database: database as any });
    const enqueueResourceMessages = vi.spyOn(mod, 'enqueueResourceMessages').mockResolvedValue([]);

    const ids = await mod.pushResourceMessageByProviderId('dmhy', '12345');

    expect(ids).toEqual([11]);
    expect(enqueueResourceMessages).toHaveBeenCalledWith([11]);
  });

  // TODO: skip for now
  it.skip('pushes all resources of a manually specified subject', async () => {
    const database = createResourceLookupDatabase([{ id: 11 }, { id: 12 }]);
    const { mod } = createPushModule({ database: database as any });
    const enqueueResourceMessages = vi.spyOn(mod, 'enqueueResourceMessages').mockResolvedValue([]);

    const ids = await mod.pushSubjectResourceMessages(615739);

    expect(ids).toEqual([11, 12]);
    expect(enqueueResourceMessages).toHaveBeenCalledWith([11, 12]);
  });

  it('normalizes fansub hashtags', () => {
    const title = readAniparTitles('kirara_fantasia')[0];
    const parsed = parse(title, { fansub: 'Kirara Fantasia' })!;
    const message = buildResourceCardMessage(
      createResource(title),
      subject,
      {
        ...parsed,
        fansub: {
          name: 'FLsnow',
          collab: ['喵萌奶茶屋', 'Nekomoe kissaten', '桜都字幕组']
        }
      },
      { site: 'animes.garden' }
    );

    expect(message.text).toContain('#雪飘工作室 #喵萌奶茶屋 #桜都字幕组');
  });
});
