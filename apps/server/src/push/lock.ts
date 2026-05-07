export class TelegramMessageLockLostError extends Error {
  public constructor(
    public readonly telegramMessageId: number,
    public readonly resourceId: number
  ) {
    super(`Telegram message ${telegramMessageId} is no longer owned by resource ${resourceId}`);
  }
}
