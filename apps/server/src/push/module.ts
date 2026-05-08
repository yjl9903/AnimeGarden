import { Bot, GrammyError } from 'grammy';
import type { Message, MessageOriginChannel } from 'grammy/types';

import type { ProviderType } from '@animegarden/client';

import { newQueue, sleep } from '@animegarden/shared';
import { and, eq, gte, inArray, lte, asc, or } from 'drizzle-orm';

import type { System } from '../system/index.ts';
import type { NewTelegramMessage, TelegramMessage } from '../schema/index.ts';

import { Module } from '../system/module.ts';

import { resources } from '../schema/resources.ts';
import { TelegramMessageStatus, telegramMessages } from '../schema/telegram.ts';

import { buildResourceCardMessage } from './message.ts';
import { type PushOptions, PushContext } from './push.ts';
import { isUniqueTelegramMessageConflict, TelegramMessageLockLostError } from './error.ts';

export class PushModule extends Module<System['modules']> {
  static readonly name = 'push';

  // Telegram API
  public bot?: Bot;

  // 串行化 Telegram API 调用
  // 解析、查重、优先级比较等数据库前置逻辑允许并发执行, 避免服务中断
  private readonly queue = newQueue(1);

  // 单进程内去重，避免同一个 resource 在上一次 pushResourceMessage 完成前重复进入前置逻辑。
  private readonly pendingResourceIds = new Set<number>();

  public async initialize(): Promise<void> {
    if (this.system.options.telegram?.token) {
      const bot = new Bot(this.system.options.telegram.token);
      this.bot = bot;
      this.initializeMessageListener(bot);
    }
  }

  private initializeMessageListener(bot: Bot) {
    const chatId = this.system.options.telegram?.chatId;

    // cron 模式 或者 cli 模式下才监听这个消息
    if (!chatId || !(this.system.options.cron || this.system.options.profile === 'cli')) {
      return;
    }

    bot.on('message', async (ctx) => {
      await this.handleMessage(ctx.message);
    });

    const polling = bot.start({ allowed_updates: ['message'] }).catch((error) => {
      this.logger.error('Telegram message listener stopped', error);
    });

    this.system.disposables.push(async () => {
      if (bot.isRunning()) {
        await bot.stop();
      }
      await polling;
    });
  }

  private async handleMessage(message: Message) {
    await this.handleUnpin(message);
  }

  // 注册消息推送任务
  public enqueueResourceMessages(ids: number[], options?: PushOptions) {
    if (!this.isConfigured()) {
      return;
    }

    const promises: Promise<{ ok: boolean } | undefined>[] = [];

    // 抓取任务不等待推送链路，真正的限流在 tg API 的 send/edit 方法内。
    for (const id of [...new Set(ids)]) {
      if (this.pendingResourceIds.has(id)) {
        continue;
      }

      this.pendingResourceIds.add(id);

      const promise = (
        options === undefined ? this.pushResourceMessage(id) : this.pushResourceMessage(id, options)
      )
        .catch((error) => {
          this.logger.error(`Failed running telegram push task for resource ${id}`, error);
          return undefined;
        })
        .finally(() => {
          this.pendingResourceIds.delete(id);
        });

      promises.push(promise);
    }

    return Promise.all(promises);
  }

  public async enqueueFailedResourceMessages() {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const failedUpdatedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pendingUpdatedBefore = new Date(Date.now() - 6 * 60 * 60 * 1000);

      // 失败补偿只看近 7 天的记录，避免太旧的失败消息在每轮抓取后永久重试。
      const failedRows = await this.database
        .selectDistinct({ resourceId: telegramMessages.resourceId })
        .from(telegramMessages)
        .where(
          and(
            eq(telegramMessages.status, TelegramMessageStatus.Failed),
            gte(telegramMessages.updatedAt, failedUpdatedAfter)
          )
        );

      // Pending/Sending 超过 6h 基本可以认为进程崩溃或 Telegram 请求卡死，先转 Failed 再重试。
      const stalePendingRows = await this.database
        .update(telegramMessages)
        .set({
          status: TelegramMessageStatus.Failed,
          updatedAt: new Date()
        })
        .where(
          and(
            inArray(telegramMessages.status, [
              TelegramMessageStatus.Pending,
              TelegramMessageStatus.Sending
            ]),
            lte(telegramMessages.updatedAt, pendingUpdatedBefore)
          )
        )
        .returning({ resourceId: telegramMessages.resourceId });

      const ids = [
        ...new Set([
          ...failedRows.map((row) => row.resourceId),
          ...stalePendingRows.map((row) => row.resourceId)
        ])
      ];

      void this.enqueueResourceMessages(ids);

      return ids;
    } catch (error) {
      this.system.logger.error('Failed enqueueing failed telegram messages', error);
      return [];
    }
  }

  public async pushResourceMessage(id: number, options?: PushOptions) {
    if (!this.isConfigured()) {
      return undefined;
    }

    const context = await this.makePushContext(id);
    if (!context) return undefined;

    const { resource } = context;

    this.logger.info(`Start pushing message of ${resource.provider}:${resource.providerId}`);

    const validated = await context.prepare();

    if (!validated) {
      this.logger.info(`Skip pushing message of ${resource.provider}:${resource.providerId}`);
      return undefined;
    }

    return await validated.run(options);
  }

  public async pushResourceMessageByProviderId(
    provider: ProviderType,
    providerId: string,
    options?: PushOptions
  ) {
    const [resource] = await this.database
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.provider, provider), eq(resources.providerId, providerId)))
      .limit(1);

    if (!resource) {
      this.logger.warn(`Resource ${provider}:${providerId} is not found`);
      return [];
    }

    if (options === undefined) {
      await this.enqueueResourceMessages([resource.id]);
    } else {
      await this.enqueueResourceMessages([resource.id], options);
    }

    return [resource.id];
  }

  /**
   * 推送 subject 下的所有消息
   */
  public async pushSubjectResourceMessages(subjectId: number, options?: PushOptions) {
    this.logger.info(`Start pushing resource messages with subject ${subjectId}`);

    const rows = await this.database
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.subjectId, subjectId), eq(resources.isDeleted, false)))
      .orderBy(asc(resources.createdAt));

    const ids = rows.map((resource) => resource.id);

    if (ids.length === 0) {
      this.logger.warn(`No resources found for subject ${subjectId}`);
      return [];
    }

    let succeed = 0;
    for (const id of ids) {
      const result = await this.enqueueResourceMessages([id], options);
      if (result?.[0]?.ok) {
        succeed += 1;
      }
    }

    this.logger.success(`Finish pushing ${succeed} resource messages with subject ${subjectId}`);

    return ids;
  }

  /**
   * Unpin forward channel 消息
   */
  private async handleUnpin(message: Message) {
    if (!message.is_automatic_forward) {
      return;
    }

    const origin = message.forward_origin;
    if (origin?.type !== 'channel') {
      return;
    }

    const isTelegramChannelOrigin = (chat: MessageOriginChannel['chat']) => {
      const configuredChatId = this.system.options.telegram?.chatId;
      if (!configuredChatId) {
        return false;
      }

      const value = String(configuredChatId);
      if (/^-?\d+$/.test(value)) {
        return String(chat.id) === value;
      }

      const username = value.startsWith('@') ? value.slice(1) : value;
      return !!chat.username && chat.username.toLowerCase() === username.toLowerCase();
    };

    if (!isTelegramChannelOrigin(origin.chat)) {
      return;
    }

    try {
      await this.unpinChatMessage(message.chat.id, message.message_id);
      this.logger.info(`Unpinned discussion message ${message.chat.id}:${message.message_id}`);
    } catch (error) {
      this.logger.warn(
        `Failed unpinning discussion message ${message.chat.id}:${message.message_id}`,
        error
      );
    }
  }

  public async makePushContext(id: number) {
    const [resource] = await this.system.modules.resources.getResourcesByIds(id);
    if (!resource) {
      return undefined;
    }

    return new PushContext(this.system, resource);
  }

  // TODO: 目前 publisher_id 去重有问题, 需要先用 fansub_id
  public async findTelegramMessage(
    publisherId: number,
    fansubId: number,
    subjectId: number,
    episode: string
  ): Promise<TelegramMessage | undefined> {
    // 消息去重: fansubId + subjectId + 归一化的 episode key
    const rows = await this.database
      .select()
      .from(telegramMessages)
      .where(
        and(
          or(
            eq(telegramMessages.publisherId, publisherId),
            eq(telegramMessages.fansubId, fansubId)
          ),
          eq(telegramMessages.subjectId, subjectId),
          eq(telegramMessages.episode, episode)
        )
      )
      .limit(1);

    return rows[0];
  }

  public async createTelegramMessagePending(
    payload: Pick<
      NewTelegramMessage,
      'resourceId' | 'publisherId' | 'fansubId' | 'subjectId' | 'episode'
    >
  ) {
    // Pending 表示前置逻辑已经选择了这条资源，但 Telegram API 还没真正开始调用。
    try {
      const [message] = await this.database
        .insert(telegramMessages)
        .values({
          resourceId: payload.resourceId,
          publisherId: payload.publisherId,
          fansubId: payload.fansubId,
          subjectId: payload.subjectId,
          episode: payload.episode,
          status: TelegramMessageStatus.Pending,
          updatedAt: new Date()
        })
        .returning();

      return message;
    } catch (error) {
      if (isUniqueTelegramMessageConflict(error)) {
        return undefined;
      }

      throw error;
    }
  }

  public async markTelegramMessagePending(
    id: number,
    expectedResourceId: number,
    payload: Pick<NewTelegramMessage, 'resourceId' | 'publisherId' | 'fansubId'>
  ) {
    // 已有 Failed/Sent 记录被新资源接管时，先落 Pending，等待 send/edit 队列串行执行。
    const [message] = await this.database
      .update(telegramMessages)
      .set({
        resourceId: payload.resourceId,
        publisherId: payload.publisherId,
        fansubId: payload.fansubId,
        status: TelegramMessageStatus.Pending,
        updatedAt: new Date()
      })
      .where(and(eq(telegramMessages.id, id), eq(telegramMessages.resourceId, expectedResourceId)))
      .returning();

    return message;
  }

  public async markTelegramMessageSending(id: number, expectedResourceId: number) {
    // Sending 只在 Telegram API 调用前一刻写入，便于区分“排队等待”和“正在请求”。
    const [message] = await this.database
      .update(telegramMessages)
      .set({
        status: TelegramMessageStatus.Sending,
        updatedAt: new Date()
      })
      .where(and(eq(telegramMessages.id, id), eq(telegramMessages.resourceId, expectedResourceId)))
      .returning();

    return message;
  }

  public async markTelegramMessageSent(
    id: number,
    expectedResourceId: number,
    payload: Pick<
      NewTelegramMessage,
      'telegramChatId' | 'telegramMessageId' | 'sentAt' | 'editedAt'
    >
  ) {
    const resp = await this.database
      .update(telegramMessages)
      .set({
        ...payload,
        status: TelegramMessageStatus.Sent,
        updatedAt: new Date()
      })
      .where(and(eq(telegramMessages.id, id), eq(telegramMessages.resourceId, expectedResourceId)))
      .returning({ id: telegramMessages.id });
    return resp[0];
  }

  public async markTelegramMessageFailed(id: number, expectedResourceId: number) {
    const resp = await this.database
      .update(telegramMessages)
      .set({
        status: TelegramMessageStatus.Failed,
        updatedAt: new Date()
      })
      .where(and(eq(telegramMessages.id, id), eq(telegramMessages.resourceId, expectedResourceId)))
      .returning({ id: telegramMessages.id });
    return resp[0];
  }

  public async sendResourceMessage(
    telegramMessageId: number,
    resourceId: number,
    message: ReturnType<typeof buildResourceCardMessage>
  ) {
    const chatId = this.system.options.telegram?.chatId;
    if (!chatId) throw new Error('telegram chat is not configured');

    // Telegram 侧发送接口串行执行，避免并发请求触发机器人限流或打乱消息顺序。
    return await this.queue.add(async () => {
      this.logger.info(`Start sending telegram message ${telegramMessageId} `);

      const sending = await this.markTelegramMessageSending(telegramMessageId, resourceId);
      if (!sending) {
        throw new TelegramMessageLockLostError(telegramMessageId, resourceId);
      }
      const resp = await this.sendPhoto(chatId, message.photo, message.text, message.options);

      this.logger.success(`Finish sending telegram message ${telegramMessageId} `);

      return resp;
    });
  }

  public async editResourceMessage(
    telegramMessageId: number,
    resourceId: number,
    chatId: number,
    messageId: number,
    message: ReturnType<typeof buildResourceCardMessage>
  ) {
    // 编辑和发送共用同一个队列，保证同一频道内的写操作按本进程提交顺序执行。
    return await this.queue.add(async () => {
      this.logger.info(`Start editing telegram message ${telegramMessageId} `);

      const sending = await this.markTelegramMessageSending(telegramMessageId, resourceId);
      if (!sending) {
        throw new TelegramMessageLockLostError(telegramMessageId, resourceId);
      }

      const resp = await this.editMessageCaption(chatId, messageId, message.text, message.options);

      this.logger.success(`Finish editing telegram message ${telegramMessageId} `);

      return resp;
    });
  }

  public async sendPhoto(
    chatId: string | number,
    photo: string,
    caption: string,
    options: Parameters<Bot['api']['sendPhoto']>[2]
  ) {
    if (!this.bot) throw new Error('telegram bot is not initialized');

    try {
      const sent = await this.bot.api.sendPhoto(chatId, photo, {
        ...options,
        caption
      });

      return sent;
    } catch (error) {
      const policy = await this.handleGrammhyError(error);
      if (policy === 'retry') {
        const sent = await this.bot.api.sendPhoto(chatId, photo, {
          ...options,
          caption
        });

        return sent;
      }

      throw error;
    }
  }

  public async editMessageCaption(
    chatId: number,
    messageId: number,
    caption: string,
    options: Parameters<Bot['api']['editMessageCaption']>[2]
  ) {
    if (!this.bot) throw new Error('telegram bot is not initialized');

    try {
      await this.bot.api.editMessageCaption(chatId, messageId, {
        ...options,
        caption
      });
      return true;
    } catch (error) {
      const policy = await this.handleGrammhyError(error);
      if (policy === 'retry') {
        await this.bot.api.editMessageCaption(chatId, messageId, {
          ...options,
          caption
        });
        return true;
      } else if (policy === 'ignore') {
        return true;
      }

      throw error;
    }
  }

  public async deleteMessage(chatId: string | number, messageId: number) {
    if (!this.bot) throw new Error('telegram bot is not initialized');

    try {
      await this.bot.api.deleteMessage(chatId, messageId);
      return true;
    } catch (error) {
      const policy = await this.handleGrammhyError(error);
      if (policy === 'retry') {
        await this.bot.api.deleteMessage(chatId, messageId);
        return true;
      }

      throw error;
    }
  }

  public async unpinChatMessage(chatId: string | number, messageId: number) {
    if (!this.bot) throw new Error('telegram bot is not initialized');

    try {
      await this.bot.api.unpinChatMessage(chatId, messageId);
      return true;
    } catch (error) {
      const policy = await this.handleGrammhyError(error);
      if (policy === 'retry') {
        await this.bot.api.unpinChatMessage(chatId, messageId);
        return true;
      } else if (policy === 'ignore') {
        return true;
      }

      throw error;
    }
  }

  private async handleGrammhyError(error: unknown) {
    if (error instanceof GrammyError) {
      if (error.error_code === 429) {
        const seconds = (error.parameters.retry_after ?? 60) + 1;
        await sleep(seconds * 1000);
        return 'retry' as const;
      }
      if (error.error_code === 400 && error.message.includes('message is not modified')) {
        return 'ignore' as const;
      }
      if (
        error.error_code === 400 &&
        (error.message.includes('message to unpin not found') ||
          error.message.includes('message is not pinned'))
      ) {
        return 'ignore' as const;
      }
    }
  }

  private isConfigured() {
    return !!this.bot && !!this.system.options.telegram?.chatId;
  }
}
