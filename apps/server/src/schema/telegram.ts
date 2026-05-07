import {
  index,
  bigint,
  integer,
  pgTable,
  serial,
  smallint,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';

export const enum TelegramMessageStatus {
  Pending = 0,
  Sending = 1,
  Sent = 2,
  Failed = -1
}

export const telegramMessages = pgTable(
  'telegram_messages',
  {
    id: serial('id').primaryKey(),
    resourceId: integer('resource_id').notNull(),
    publisherId: integer('publisher_id').notNull(),
    fansubId: integer('fansub_id'),
    subjectId: integer('subject_id').notNull(),
    episode: varchar('episode', { length: 128 }).notNull(),
    telegramChatId: bigint('telegram_chat_id', { mode: 'number' }),
    telegramMessageId: bigint('telegram_message_id', { mode: 'number' }),
    status: smallint('status').$type<TelegramMessageStatus>().notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => {
    return [
      uniqueIndex('unique_telegram_messages_publisher_subject_episode').on(
        t.publisherId,
        t.subjectId,
        t.episode
      ),
      index('telegram_messages_resource_id_index').on(t.resourceId),
      index('telegram_messages_status_index').on(t.status)
    ];
  }
);
