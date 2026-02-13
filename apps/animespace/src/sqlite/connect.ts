import Sqlite from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import type { Space } from '../system/space.ts';

import type { Database } from './types.ts';

import { torrents } from './torrent.ts';
import { subjectFiles, subjects } from './subject.ts';
import { resources, filters, filterResources } from './animegarden.ts';
import { MetadataKey, metadata, getMetadata, setMetadata } from './metadata.ts';

const CURRENT_SCHEMA_VERSION = 1;

export async function openDatabase(
  space: Space
): Promise<{ client: Sqlite.Database; database: Database }> {
  const client = new Sqlite(space.sqlite.path.path);

  const database = drizzle(client, {
    schema: { metadata, subjects, subjectFiles, resources, filters, filterResources, torrents }
  });

  await migrateDatabase(database);

  return { client, database };
}

export async function migrateDatabase(database: Database) {
  await database.run(sql.raw('BEGIN IMMEDIATE'));
  try {
    await ensureMetadataTable(database);

    const currentVersion = await readSchemaVersion(database);
    if (currentVersion < 1) {
      await migrateV1(database);

      const resp = await setMetadata(database, MetadataKey.SCHEMA_VERSION, CURRENT_SCHEMA_VERSION);
      if (!resp.ok) {
        throw resp.error;
      }
    }

    await database.run(sql.raw('COMMIT'));
  } catch (error) {
    await database.run(sql.raw('ROLLBACK'));
    throw error;
  }
}

async function ensureMetadataTable(database: Database) {
  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
      )
    `)
  );
}

async function readSchemaVersion(database: Database) {
  const result = await getMetadata<number | string | null>(database, MetadataKey.SCHEMA_VERSION, 0);
  if (!result.ok) {
    throw result.error;
  }

  const version = result.value;
  if (typeof version === 'number' && Number.isFinite(version)) {
    return Math.max(0, Math.floor(version));
  }

  if (typeof version === 'string') {
    const parsed = Number(version);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }

  return 0;
}

async function migrateV1(database: Database) {
  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        enable INTEGER NOT NULL,
        source TEXT,
        naming TEXT
      )
    `)
  );

  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS subject_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        subject_id INTEGER NOT NULL,
        storage TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER DEFAULT 0,
        mtime INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        torrent_id INTEGER,
        torrent_file TEXT
      )
    `)
  );

  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS animegarden_resources (
        id INTEGER PRIMARY KEY NOT NULL,
        provider_name TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        title TEXT NOT NULL,
        href TEXT NOT NULL,
        type TEXT NOT NULL,
        magnet TEXT NOT NULL,
        tracker TEXT NOT NULL,
        size INTEGER NOT NULL,
        publisher TEXT NOT NULL,
        fansub TEXT,
        created_at INTEGER NOT NULL,
        fetched_at INTEGER NOT NULL
      )
    `)
  );

  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS animegarden_filters (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        key TEXT NOT NULL,
        filter TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        fetched_at INTEGER NOT NULL
      )
    `)
  );

  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS animegarden_filter_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        filter_id INTEGER NOT NULL,
        resource_id INTEGER NOT NULL
      )
    `)
  );

  await database.run(
    sql.raw(`
      CREATE TABLE IF NOT EXISTS torrents (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        info_hash TEXT NOT NULL,
        downloader TEXT NOT NULL,
        files TEXT,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  );

  await database.run(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS animegarden_resources_provider_id
      ON animegarden_resources (provider_name, provider_id)
    `)
  );
  await database.run(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS animegarden_resources_created_at
      ON animegarden_resources (created_at)
    `)
  );
  await database.run(
    sql.raw(`
      CREATE INDEX IF NOT EXISTS animegarden_resources_fetched_at
      ON animegarden_resources (fetched_at)
    `)
  );
  await database.run(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS animegarden_filters_key_unique
      ON animegarden_filters (key)
    `)
  );
  await database.run(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS animegarden_filter_resources_filter_id_resource_id
      ON animegarden_filter_resources (filter_id, resource_id)
    `)
  );
  await database.run(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS subject_files_storage_path
      ON subject_files (storage, path)
    `)
  );
  await database.run(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS subjects_name_unique
      ON subjects (name)
    `)
  );

  await database.run(
    sql.raw(`
      CREATE UNIQUE INDEX IF NOT EXISTS torrents_info_hash_unique
      ON torrents (info_hash)
    `)
  );
}
