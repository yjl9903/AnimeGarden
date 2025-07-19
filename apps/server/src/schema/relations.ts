import { relations } from 'drizzle-orm';

import { subjects } from './subjects';
import { teams, users } from './users';
import { resources } from './resources';

export const resourcesRelations = relations(resources, ({ one }) => ({
  publisher: one(users, {
    fields: [resources.publisherId],
    references: [users.id]
  }),
  fansub: one(teams, {
    fields: [resources.fansubId],
    references: [teams.id]
  }),
  subject: one(subjects, {
    fields: [resources.subjectId],
    references: [subjects.id]
  })
}));

export const userRelations = relations(users, ({ many }) => ({
  resources: many(resources)
}));

export const teamRelations = relations(teams, ({ many }) => ({
  resources: many(resources)
}));

export const subjectRelations = relations(subjects, ({ many }) => ({
  resources: many(resources)
}));
