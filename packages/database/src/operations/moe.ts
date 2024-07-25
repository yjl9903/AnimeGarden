import MeiliSearch from 'meilisearch';

import { parse } from 'anitomy';
import { and, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import { normalizeTitle, type FetchedResource } from 'animegarden';

import type { Database } from '../connection';
import type { NewResource, Resource } from '../schema';

import { resources } from '../schema/resource';
import { insertResourceDocuments } from '../meilisearch';

export async function insertMoeResources(
  database: Database,
  meili: MeiliSearch,
  fetchedResources: FetchedResource[]
) {
  // TODO
  return [];
}
