import fs from 'node:fs';
import path from 'node:path';

import { parse } from 'anipar';
import { describe, expect, it, vi } from 'vitest';

import type { BasicSubject } from 'bgmd';
import type { FoundResource } from '../src/resources/query';
import { buildResourceCardMessage, PushModule } from '../src/push';

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
    const resource = createResource(readAniparTitles('ani')[0]);
    resource.publisher.name = 'ANi';
    resource.fansub = {
      id: 1,
      name: 'ANi'
    };
    resource.subjectId = 615739;
    const sendPhoto = vi.fn().mockResolvedValue({});
    const getResourcesByIds = vi.fn().mockResolvedValue([resource]);
    const mod = new PushModule(
      {
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
    mod.bot = {
      api: {
        sendPhoto
      }
    } as any;

    await mod.pushResourceMessages([1]);

    expect(getResourcesByIds).toHaveBeenCalledWith(1);
    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendPhoto.mock.calls[0][0]).toBe('@animegarden_test');
    expect(sendPhoto.mock.calls[0][1]).toBeTruthy();
    expect(sendPhoto.mock.calls[0][2]).toMatchObject({
      parse_mode: 'HTML',
      caption: expect.stringContaining('查看详情')
    });
    expect('link_preview_options' in sendPhoto.mock.calls[0][2]).toBe(false);
  });

  it('falls back to a text message when sending photo fails', async () => {
    const resource = createResource(readAniparTitles('ani')[0]);
    resource.publisher.name = 'ANi';
    resource.fansub = {
      id: 1,
      name: 'ANi'
    };
    resource.subjectId = 615739;
    const sendPhoto = vi.fn().mockRejectedValue(new Error('photo failed'));
    const sendMessage = vi.fn().mockResolvedValue({});
    const getResourcesByIds = vi.fn().mockResolvedValue([resource]);
    const mod = new PushModule(
      {
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
    mod.bot = {
      api: {
        sendPhoto,
        sendMessage
      }
    } as any;
    vi.spyOn(mod.logger, 'warn').mockImplementation(() => {});

    await mod.pushResourceMessages([1]);

    expect(sendPhoto).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls[0][0]).toBe('@animegarden_test');
    expect(sendMessage.mock.calls[0][1]).toContain('查看详情');
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
