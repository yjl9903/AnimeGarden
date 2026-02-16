import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

import type { TorrentFile, TorrentStatus } from '../download/torrent.ts';

// Manage pending, downloading, downloaded torrents
export const torrents = sqliteTable('torrents', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  infoHash: text('info_hash').unique().notNull(),
  downloader: text('downloader').notNull(),
  files: text('files', { mode: 'json' }).$type<TorrentFile[]>(),
  status: text('status').$type<TorrentStatus>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
});

export type DatabaseTorrent = typeof torrents.$inferSelect;
