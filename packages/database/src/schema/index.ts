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

  provider_type: Resource['provider'];

  provider_id: Resource['providerId'];

  href: Resource['href'];

  title: Resource['title'];

  title_alt: Resource['titleAlt'];

  type: Resource['type'];

  size: Resource['size'];

  magnet: Resource['magnet'];

  created_at: number;

  fetched_at: number;

  anitomy: Record<string, any>;

  fansub_id: string | null;

  publisher_id: string;

  isDeleted: Resource['isDeleted'];

  isDuplicated: Resource['isDuplicated'];
}
