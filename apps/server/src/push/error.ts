export class TelegramMessageLockLostError extends Error {
  public constructor(
    public readonly telegramMessageId: number,
    public readonly resourceId: number
  ) {
    super(`Telegram message ${telegramMessageId} is no longer owned by resource ${resourceId}`);
  }
}

export function isUniqueTelegramMessageConflict(error: unknown) {
  let current = error;
  while (typeof current === 'object' && current !== null) {
    const code = 'code' in current && typeof current.code === 'string' ? current.code : undefined;
    const message =
      'message' in current && typeof current.message === 'string'
        ? current.message.toLowerCase()
        : '';
    const constraint =
      'constraint_name' in current && typeof current.constraint_name === 'string'
        ? current.constraint_name
        : 'constraint' in current && typeof current.constraint === 'string'
          ? current.constraint
          : '';

    if (
      code === '23505' &&
      (constraint === 'unique_telegram_messages_publisher_subject_episode' ||
        constraint === 'unique_telegram_messages_fansub_subject_episode' ||
        message.includes('unique_telegram_messages_publisher_subject_episode') ||
        message.includes('unique_telegram_messages_fansub_subject_episode') ||
        message.includes('telegram_messages'))
    ) {
      return true;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return false;
}
