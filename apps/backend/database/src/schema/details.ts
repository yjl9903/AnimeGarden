import { boolean, integer, json, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { resources } from './resources';

export interface MagnetInfo {
  name: string;

  magnet: string;

  tracker: string;
}

export interface FileInfo {
  name: string;

  size: string;
}

export const details = pgTable(
  'details',
  {
    id: integer('id')
      .primaryKey()
      .references(() => resources.id),
    description: text('description').notNull().default(''),
    magnets: json('magnets').$type<MagnetInfo[]>().notNull().default([]),
    files: json('files').$type<FileInfo[]>().notNull().default([]),
    hasMoreFiles: boolean('has_more_files').notNull().default(false),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
  },
  (_t) => {
    return {};
  }
);
