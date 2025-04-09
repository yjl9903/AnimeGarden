import { providers } from './providers';
import { resources } from './resources';
import { details } from './details';
import { subjects } from './subjects';
import { tags } from './tags';
import { users, teams } from './users';
import { collections } from './collections';

export type { MagnetInfo, FileInfo } from './details';

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
