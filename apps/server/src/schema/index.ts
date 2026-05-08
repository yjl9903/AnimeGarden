import { providers } from './providers.ts';
import { resources } from './resources.ts';
import { details } from './details.ts';
import { subjects } from './subjects.ts';
import { tags } from './tags.ts';
import { users, teams } from './users.ts';
import { collections } from './collections.ts';
import { telegramMessages } from './telegram.ts';

export type { MagnetInfo, FileInfo } from './details.ts';

export * from './drizzle/index.ts';

export type Provider = typeof providers.$inferSelect;

export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type Team = typeof teams.$inferSelect;

export type NewTeam = typeof teams.$inferInsert;

export type NewResource = typeof resources.$inferInsert;

export type Resource = typeof resources.$inferSelect;

export type NewDetail = typeof details.$inferInsert;

export type Detail = typeof details.$inferSelect;

export type NewTag = typeof tags.$inferInsert;

export type Tag = typeof tags.$inferSelect;

export type NewSubject = typeof subjects.$inferInsert;

export type Subject = typeof subjects.$inferSelect;

export type NewCollection = typeof collections.$inferInsert;

export type Collection = typeof collections.$inferSelect;

export type NewTelegramMessage = typeof telegramMessages.$inferInsert;

export type TelegramMessage = typeof telegramMessages.$inferSelect;
