import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { SubjectSource } from '../subject/source/source.ts';
import type { SubjectNaming } from '../subject/source/naming.ts';

// Subjects from collection files
export const subjects = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  name: text('name').unique().notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  source: text('source', { mode: 'json' }).$type<SubjectSource>().notNull(),
  naming: text('naming', { mode: 'json' }).$type<SubjectNaming>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

export type DatabaseSubject = typeof subjects.$inferSelect;

// Subject files uploaded to the storage
export const subjectFiles = sqliteTable(
  'subject_files',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    subjectId: integer('subject_id').notNull(),

    storage: text('storage').notNull(),
    path: text('path').notNull(),
    size: integer('size').default(0),
    mtime: integer('mtime').notNull(),
    checksum: text('checksum').notNull(),

    // Related source
    source: text('source'),

    // Related Anime Garden resource id
    animegardenProvider: text('animegarden_provider_name'),
    animegardenProviderId: text('animegarden_provider_id'),

    // Related torrent info hash and corresponding filepath
    torrentInfoHash: integer('torrent_info_hash'),
    torrentFilePath: text('torrent_file_path')
  },
  (t) => {
    return [uniqueIndex('subject_files_storage_path').on(t.storage, t.path)];
  }
);

export type DatabaseSubjectFile = typeof subjectFiles.$inferSelect;
