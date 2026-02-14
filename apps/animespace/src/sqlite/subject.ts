import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Subjects from collection files
export const subjects = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  name: text('name').unique().notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  source: text('source', { mode: 'json' }).$type<{}>(), // TODO
  naming: text('naming', { mode: 'json' }).$type<{}>() // TODO
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

    // Related torrent id and corresponding filepath
    torrentId: integer('torrent_id'),
    torrentFile: text('torrent_file')
  },
  (t) => {
    return [uniqueIndex('subject_files_storage_path').on(t.storage, t.path)];
  }
);

export type DatabaseSubjectFile = typeof subjectFiles.$inferSelect;
