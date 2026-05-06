import { Bot, HttpError } from 'grammy';

import { parse } from 'anipar';

import type { System } from '../system/index.ts';
import type { FoundResource } from '../resources/query.ts';

import { Module } from '../system/module.ts';

import { shouldSendFansub } from './fansub.ts';
import { buildResourceCardMessage } from './message.ts';
import { getSubjectById } from '../utils/bgmd.ts';

export class PushModule extends Module<System['modules']> {
  static readonly name = 'push';

  public bot?: Bot;

  public async initialize(): Promise<void> {
    if (this.system.options.telegram?.token) {
      const bot = new Bot(this.system.options.telegram.token);
      this.bot = bot;

      await this.pushResourceMessages([2429971]);
    }
  }

  public async pushResourceMessages(ids: number[]) {
    if (!this.bot || !this.system.options.telegram?.chatId) {
      return;
    }

    this.logger.info(`Start pushing resource messages`);

    const resources = await this.system.modules.resources.getResourcesByIds(...ids);

    let success = 0;

    for (const resource of resources) {
      try {
        const resp = await this.pushResourceMessage(resource);
        if (resp?.ok) {
          success += 1;
        }
      } catch (error) {
        this.logger.error(
          `Failed pushing resource ${resource.provider}:${resource.providerId}`,
          error
        );
      }
    }

    this.logger.info(`Finish pushing ${success} resource messages`);
  }

  private async pushResourceMessage(resource: FoundResource) {
    this.logger.info(`Start sending message of ${resource.provider}:${resource.providerId}`);

    const fansub = resource.fansub?.name;
    if (!fansub || !shouldSendFansub(fansub)) {
      return undefined;
    }

    const subject = resource.subjectId ? getSubjectById(resource.subjectId) : undefined;
    const parsed = parse(resource.title, { fansub });
    if (!subject || !parsed) {
      this.logger.warn(`Failed parsing "${resource.fansub?.name}" "${resource.title}"`);
      return undefined;
    }

    // TODO

    const message = buildResourceCardMessage(resource, subject, parsed, this.system.options);

    const sent = await this.sendPhoto(message.photo, message.text, message.options).catch(
      async (error) => {
        this.logger.warn(
          `Failed sending photo of ${resource.provider}:${resource.providerId}, fallback to text message`
        );
        this.logTelegramNetworkError(error);
        return await this.sendMessage(message.text, message.options);
      }
    );

    this.logger.info(
      `Finish sending message ${sent.message_id} of ${resource.provider}:${resource.providerId}`
    );

    return {
      ok: true
    };
  }

  private async sendPhoto(
    photo: string,
    caption: string,
    options: Parameters<Bot['api']['sendPhoto']>[2]
  ) {
    const chatId = this.system.options.telegram?.chatId;

    if (!this.bot) throw new Error('telegram bot is not initialized');
    if (!chatId) throw new Error('telegram chat is not configured');

    const sent = await this.bot.api.sendPhoto(chatId, photo, {
      ...options,
      caption
    });

    return sent;
  }

  private async sendMessage(text: string, options: Parameters<Bot['api']['sendMessage']>[2]) {
    const chatId = this.system.options.telegram?.chatId;

    if (!this.bot) throw new Error('telegram bot is not initialized');
    if (!chatId) throw new Error('telegram chat is not configured');

    const sent = await this.bot.api.sendMessage(chatId, text, options);

    return sent;
  }

  private async editMessageText(
    messageId: number,
    text: string,
    options: Parameters<Bot['api']['editMessageText']>[3]
  ) {
    const chatId = this.system.options.telegram?.chatId;

    if (!this.bot) throw new Error('telegram bot is not initialized');
    if (!chatId) throw new Error('telegram chat is not configured');

    const sent = await this.bot.api.editMessageText(chatId, messageId, text, options);

    return sent;
  }

  private logTelegramNetworkError(error: unknown) {
    if (error instanceof HttpError) {
      this.logger.warn(error.message);
      if (error.error) {
        this.logger.warn(error.error);
      }
      return;
    }
    this.logger.warn(error);
  }
}
