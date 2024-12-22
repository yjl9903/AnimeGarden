import { users, teams } from './user';

export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type Team = typeof teams.$inferSelect;

export type NewTeam = typeof teams.$inferInsert;
