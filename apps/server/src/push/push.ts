import type { BasicSubject } from 'bgmd';

import { type ParseResult, parse } from 'anipar';
import { SupportProviders } from '@animegarden/client';

import type { System } from '../system/index.ts';
import type { FoundResource } from '../resources/query.ts';
import type { TelegramMessage } from '../schema/index.ts';

import { getSubjectById } from '../utils/bgmd.ts';
import { TelegramMessageStatus } from '../schema/telegram.ts';

import { buildResourceCardMessage } from './message.ts';
import { TelegramMessageLockLostError } from './error.ts';
import { shouldSendFansubResource, shouldSendTypeResource } from './guard.ts';

export interface PushOptions {
  /**
   * 强制重推之前已经成功的消息
   *
   * @default false
   */
  force?: boolean;
}

export class PushContext {
  public readonly system: System;

  public readonly resource: FoundResource;

  public publisher!: FoundResource['publisher'];

  public fansub!: NonNullable<FoundResource['fansub']>;

  public subject!: BasicSubject;

  public parsed!: ParseResult;

  public episode: string = '';

  public telegramMessage: TelegramMessage | undefined;

  public constructor(system: System, resource: FoundResource) {
    this.system = system;
    this.resource = resource;
  }

  public get logger() {
    return this.system.modules.push.logger;
  }

  public async prepare(): Promise<PushContext | undefined> {
    const { resource } = this;

    // 过滤 "动画" 资源
    if (!shouldSendTypeResource(resource.type)) {
      return undefined;
    }

    // 过滤和解析都使用字幕组名；无 fansub 的资源退回 publisher 名称，例如 ANi。
    const fansubName = resource.fansub?.name ?? resource.publisher.name;
    if (!shouldSendFansubResource(fansubName)) {
      return undefined;
    }

    // subject 和 episode 是消息去重键的一部分，解析失败时不写 telegram_messages。
    const subject = resource.subjectId ? getSubjectById(resource.subjectId) : undefined;
    const parsed = parse(resource.title, { fansub: fansubName });
    const episode = parsed ? normalizeParsedEpisode(parsed) : undefined;

    const publisher = resource.publisher;
    const fansub = resource.fansub;

    if (!subject || !parsed || !episode || !publisher || !fansub || !resource.subjectId) {
      this.logger.warn(
        `Failed parsing "${resource.fansub?.name ?? resource.publisher.name}" "${resource.title}"`
      );
      return undefined;
    }

    this.publisher = publisher;
    this.fansub = fansub;
    this.subject = subject;
    this.parsed = parsed;
    this.episode = episode;

    return this;
  }

  public compare(rhs: PushContext): number {
    // 优先级: 版本号 > 多语言字幕 > provider 优先级 > 发布时间最晚优先
    const lhsVersion = this.parsed.version ?? 0;
    const rhsVersion = rhs.parsed.version ?? 0;
    if (lhsVersion !== rhsVersion) return lhsVersion - rhsVersion;

    const lhsLanguage = getSubtitleLanguagePriority(this.parsed);
    const rhsLanguage = getSubtitleLanguagePriority(rhs.parsed);
    if (lhsLanguage !== rhsLanguage) return lhsLanguage - rhsLanguage;

    const lhsProvider = getProviderPriority(this.resource.provider);
    const rhsProvider = getProviderPriority(rhs.resource.provider);
    if (lhsProvider !== rhsProvider) return lhsProvider - rhsProvider;

    return new Date(this.resource.createdAt).getTime() - new Date(rhs.resource.createdAt).getTime();
  }

  public async run(options?: PushOptions): Promise<{ ok: boolean } | undefined> {
    const { publisher, fansub, resource, subject, episode } = this;

    const existing = await this.system.modules.push.findTelegramMessage(
      publisher.id,
      fansub.id,
      subject.id,
      episode
    );

    if (!existing) {
      // 无历史消息时创建新记录并走首次发送流程。
      return await this.push(existing);
    }

    if (
      existing.status === TelegramMessageStatus.Pending ||
      existing.status === TelegramMessageStatus.Sending
    ) {
      // Pending/Sending 也允许更高优先级资源抢占；真正发送前再用 resourceId 做乐观锁。
      const previous = await this.system.modules.push.makePushContext(existing.resourceId);
      await previous?.prepare();

      if (previous && this.compare(previous) <= 0) {
        this.logger.info(
          `Skip pushing ${resource.provider}:${resource.providerId}, existing pending resource has higher priority`
        );
        return undefined;
      }

      return await this.push(existing);
    } else if (existing.status === TelegramMessageStatus.Failed) {
      // Failed 记录会比较旧资源和当前资源；谁优先级高，就用谁重新发一条 Telegram 消息。
      const previous = await this.system.modules.push.makePushContext(existing.resourceId);
      await previous?.prepare();

      if (previous && this.compare(previous) < 0) {
        return await previous.push(existing);
      } else {
        return await this.push(existing);
      }
    } else if (existing.status === TelegramMessageStatus.Sent) {
      // Sent 记录只允许更高优先级的新资源接管；否则保持原 Telegram 消息不变。
      const previous = await this.system.modules.push.makePushContext(existing.resourceId);
      await previous?.prepare();

      // 强制重推之前已经推过的消息
      if (options?.force && previous && previous.resource.id === resource.id) {
        return await this.push(existing);
      }

      if (previous && this.compare(previous) <= 0) {
        this.logger.info(
          `Skip editing telegram message of ${resource.provider}:${resource.providerId}, existing resource has higher priority`
        );
        return undefined;
      }
      // 历史消息缺少 chat/message id 时无法编辑，后续 push 会退化为重新发送。
      if (!existing.telegramChatId) {
        this.logger.warn(
          `Telegram message of ${resource.provider}:${resource.providerId}, chat id is missing`
        );
      }
      if (!existing.telegramMessageId) {
        this.logger.warn(
          `Telegram message of ${resource.provider}:${resource.providerId}, message id is missing`
        );
      }

      return await this.push(existing, options);
    }

    return await this.push(existing, options);
  }

  public async push(
    existing: TelegramMessage | undefined,
    options?: PushOptions
  ): Promise<{ ok: boolean } | undefined> {
    const { resource, publisher, fansub, subject, parsed, episode: episodeStr } = this;

    // 这里先写 Pending，真正进入 Telegram API 队列时再切 Sending。
    const telegramMessage = existing
      ? await this.system.modules.push.markTelegramMessagePending(
          existing.id,
          existing.resourceId,
          {
            resourceId: resource.id,
            publisherId: publisher.id,
            fansubId: fansub.id
          }
        )
      : await this.system.modules.push.createTelegramMessagePending({
          resourceId: resource.id,
          publisherId: publisher.id,
          fansubId: fansub.id,
          subjectId: subject.id,
          episode: episodeStr
        });

    if (!telegramMessage) {
      // 同一去重键并发创建或抢占时，重新读取最新 owner 再比较优先级。
      return await this.run(options);
    }

    const message = buildResourceCardMessage(resource, subject, parsed, this.system.options);

    try {
      if (existing?.telegramChatId && existing.telegramMessageId) {
        // 历史消息定位信息完整时编辑原消息，保持频道内同一集只占一条消息。
        await this.system.modules.push.editResourceMessage(
          telegramMessage.id,
          resource.id,
          existing.telegramChatId,
          existing.telegramMessageId,
          message
        );

        const marked = await this.system.modules.push.markTelegramMessageSent(
          telegramMessage.id,
          resource.id,
          {
            editedAt: new Date()
          }
        );

        if (!marked) {
          this.logger.warn(
            `Skip marking stale telegram edit of ${resource.provider}:${resource.providerId}`
          );
          return undefined;
        }

        this.logger.success(
          `Finish editing message ${telegramMessage.id} of ${resource.provider}:${resource.providerId}`
        );

        return {
          ok: true
        };
      } else {
        // 首次发送、失败重试、或无法编辑历史消息时，都按新 Telegram 消息发送。
        const sent = await this.system.modules.push.sendResourceMessage(
          telegramMessage.id,
          resource.id,
          message
        );

        const marked = await this.system.modules.push.markTelegramMessageSent(
          telegramMessage.id,
          resource.id,
          {
            telegramChatId: sent.chat?.id,
            telegramMessageId: sent.message_id,
            sentAt: new Date()
          }
        );

        if (!marked) {
          await this.deleteStaleSentMessage(sent.chat?.id, sent.message_id);
          this.logger.warn(
            `Deleted stale telegram message ${telegramMessage.id} of ${resource.provider}:${resource.providerId}`
          );
          return undefined;
        }

        this.logger.success(
          `Finish sending message ${telegramMessage.id} of ${resource.provider}:${resource.providerId}`
        );

        return {
          ok: true
        };
      }
    } catch (error) {
      if (error instanceof TelegramMessageLockLostError) {
        this.logger.info(
          `Skip stale telegram task of ${resource.provider}:${resource.providerId}, telegram message owner changed`
        );
        return undefined;
      }

      // 失败状态由补偿任务重新拉起；保留当前 resourceId 便于下轮继续比较优先级。
      const marked = await this.system.modules.push.markTelegramMessageFailed(
        telegramMessage.id,
        resource.id
      );
      if (!marked) {
        this.logger.warn(
          `Skip marking stale telegram failure of ${resource.provider}:${resource.providerId}`
        );
      }

      throw error;
    }
  }

  private async deleteStaleSentMessage(chatId: string | number | undefined, messageId: number) {
    if (!chatId) {
      this.logger.warn(`Cannot delete stale telegram message ${messageId}, chat id is missing`);
      return;
    }

    try {
      await this.system.modules.push.deleteMessage(chatId, messageId);
    } catch (error) {
      this.logger.warn(`Failed deleting stale telegram message ${messageId}`, error);
    }
  }
}

export function normalizeParsedEpisode(parsed: ParseResult) {
  // 归一化 episode 用作数据库去重键，保留单集、范围、多集三种语义。
  if (parsed.episodesRange) {
    return `episodes_range:${formatEpisodeNumber(
      parsed.episodesRange.from,
      parsed.episodesRange.fromSub
    )}-${formatEpisodeNumber(parsed.episodesRange.to, parsed.episodesRange.toSub)}`;
  }
  if (parsed.episodes?.length) {
    return `episodes:${parsed.episodes
      .map((episode) => formatEpisodeNumber(episode.number, episode.numberSub))
      .join('-')}`;
  }
  if (parsed.episode) {
    return `episode:${formatEpisodeNumber(parsed.episode.number, parsed.episode.numberSub)}`;
  }
  return undefined;
}

function formatEpisodeNumber(number: number, numberSub?: number) {
  return numberSub !== undefined ? `${number}.${numberSub}` : `${number}`;
}

function getSubtitleLanguagePriority(parsed: ParseResult) {
  // 简中受众优先，其次繁中；没有明确简繁时保持最低优先级。
  const languages = parsed.subtitle?.languages ?? [];
  if (languages.includes('简')) return 2;
  if (languages.includes('繁')) return 1;
  return 0;
}

function getProviderPriority(provider: string) {
  // SupportProviders 已按业务偏好排序，越靠前优先级越高。
  const index = SupportProviders.indexOf(provider as any);
  return index === -1 ? -1 : SupportProviders.length - index;
}
