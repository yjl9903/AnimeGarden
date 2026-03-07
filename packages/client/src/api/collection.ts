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
      method: 'PUT',
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
      hash: resp.hash,
      createdAt: resp.createdAt,
      timestamp: resp.timestamp
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
    const timestamp = resp.timestamp as Date | undefined;
    if (!timestamp) {
      return undefined;
    }

    return {
      ok: true,
      ...resp,
      timestamp
    };
  }

  return undefined;
}
