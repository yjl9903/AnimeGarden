import { teams } from './team';
import { users } from './user';
import { resources } from './resource';

export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type Team = typeof teams.$inferSelect;

export type NewTeam = typeof teams.$inferInsert;

export type Resource = typeof resources.$inferSelect;

export type NewResource = typeof resources.$inferInsert;
