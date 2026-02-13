import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import type { metadata } from './metadata.ts';
import type { torrents } from './torrent.ts';
import type { subjects, subjectFiles } from './subject.ts';
import type { resources, filters, filterResources } from './animegarden.ts';

export type Database = BetterSQLite3Database<{
  metadata: typeof metadata;
  subjects: typeof subjects;
  subjectFiles: typeof subjectFiles;
  resources: typeof resources;
  filters: typeof filters;
  filterResources: typeof filterResources;
  torrents: typeof torrents;
}>;
