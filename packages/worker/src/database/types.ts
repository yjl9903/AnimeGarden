import type { ColumnType } from 'kysely';
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Resource = {
  id: number;
  href: string;
  title: string;
  titleAlt: string;
  type: string;
  size: string;
  magnet: string;
  createdAt: Timestamp;
  fetchedAt: Timestamp;
  anitomy: unknown | null;
  fansubId: number | null;
  publisherId: number;
  provider: string;
  isDeleted: Generated<number>;
};
export type Team = {
  id: Generated<number>;
  name: string;
  provider: string;
};
export type User = {
  id: Generated<number>;
  name: string;
  provider: string;
};
export type DB = {
  Resource: Resource;
  Team: Team;
  User: User;
};
