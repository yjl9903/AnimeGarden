import type {
  Collection,
  CollectionResourcesResult,
  CollectionResult,
  FetchOptions
} from '../types';

import { fetchAPI } from './base';

export async function generateCollection(
  collection: Collection<true>,
  options: FetchOptions = {}
): Promise<CollectionResult<true, false> | undefined> {
  const body = JSON.stringify({
    ...collection,
    filters: collection.filters.map((f) => ({ ...f, resources: undefined, complete: undefined }))
  });

  const resp = await fetchAPI<any>(
    'collection',
    {
      method: 'POST',
      body
    },
    options
  ).catch((_err) => {
    return undefined;
  });

  if (resp) {
    return {
      ok: true,
      ...collection,
      createdAt: resp.createdAt,
      hash: resp.hash,
      timestamp: new Date(resp.timestamp)
    };
  }

  return undefined;
}

export async function fetchCollection(
  hash: string,
  options: FetchOptions = {}
): Promise<CollectionResourcesResult<true, false, { tracker: true }> | undefined> {
  const resp = await fetchAPI<any>(
    `collection/${hash}`,
    {
      method: 'GET'
    },
    options
  ).catch((_err) => {
    return undefined;
  });

  if (resp) {
    return {
      ok: true,
      ...resp,
      timestamp: new Date(resp.timestamp)
    };
  }

  return undefined;
}
