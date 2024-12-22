import { teams } from './team';
import { users } from './user';
import { resources } from './resource';

export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type Team = typeof teams.$inferSelect;

export type NewTeam = typeof teams.$inferInsert;

export type Resource = typeof resources.$inferSelect;

export type NewResource = typeof resources.$inferInsert;

export interface ResourceDocument {
  id: number;

  provider: Resource['provider'];

  providerId: Resource['providerId'];

  href: Resource['href'];

  title: Resource['title'];

  titleAlt: Resource['titleAlt'];

  type: Resource['type'];

  size: Resource['size'];

  magnet: Resource['magnet'];

  tracker: Resource['tracker'];

  createdAt: number;

  fetchedAt: number;

  anitomy: Record<string, any>;

  fansubId: string | null;

  publisherId: string;

  isDeleted: Resource['isDeleted'];

  isDuplicated: Resource['isDuplicated'];
}

