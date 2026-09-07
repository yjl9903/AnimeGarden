import type {
  Collection,
  CollectionResourcesResult,
  CollectionResult,
  FetchOptions
} from '../types';

import { AnimeGardenError, type ClientResult, toClientFailure } from '../error';

import { fetchAPI } from './base';
import {
  isPaginationPayload,
  isRecord,
  normalizeResolvedFilterPayload,
  normalizeResourcePayload
} from './validation';

export type GeneratedCollectionData = Omit<CollectionResult<true, false>, 'ok'>;

export type CollectionData = Omit<CollectionResourcesResult<true, false, { tracker: true }>, 'ok'>;

export async function generateCollection(
  collection: Collection<true>,
  options: FetchOptions = {}
): Promise<ClientResult<GeneratedCollectionData>> {
  const body = JSON.stringify({
    ...collection,
    // Query results are client state, including the legacy completion flag stored by older clients.
    filters: collection.filters.map((f) => ({
      ...f,
      resources: undefined,
      pagination: undefined,
      complete: undefined
    }))
  });

  try {
    const resp = await fetchAPI<any>(
      'collection',
      {
        method: 'PUT',
        body
      },
      options
    );

    if (
      !resp ||
      typeof resp !== 'object' ||
      Array.isArray(resp) ||
      typeof resp.hash !== 'string' ||
      typeof resp.createdAt !== 'string' ||
      !(resp.timestamp instanceof Date)
    ) {
      throw AnimeGardenError.fromInvalidResponse('Invalid response PUT /collection', resp);
    }

    return {
      ok: true,
      ...collection,
      hash: resp.hash,
      createdAt: resp.createdAt,
      timestamp: resp.timestamp
    };
  } catch (error) {
    return toClientFailure(error);
  }
}

export async function fetchCollection(
  hash: string,
  options: FetchOptions = {}
): Promise<ClientResult<CollectionData>> {
  if (!hash.trim()) {
    return toClientFailure(AnimeGardenError.fromBadRequest('Collection hash is required'));
  }

  try {
    const resp = await fetchAPI<any>(
      `collection/${hash}`,
      {
        method: 'GET'
      },
      options
    );

    if (
      !resp ||
      typeof resp !== 'object' ||
      Array.isArray(resp) ||
      typeof resp.hash !== 'string' ||
      typeof resp.name !== 'string' ||
      typeof resp.createdAt !== 'string' ||
      !Array.isArray(resp.filters) ||
      !resp.filters.every(normalizeCollectionFilterPayload) ||
      !Array.isArray(resp.results) ||
      !resp.results.every(normalizeCollectionResultPayload) ||
      !(resp.timestamp instanceof Date)
    ) {
      throw AnimeGardenError.fromInvalidResponse(`Invalid response /collection/${hash}`, resp);
    }

    return {
      ok: true,
      ...resp,
      timestamp: resp.timestamp
    };
  } catch (error) {
    return toClientFailure(error);
  }
}

function normalizeCollectionFilterPayload(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.searchParams === 'string' &&
    normalizeResolvedFilterPayload(value)
  );
}

function normalizeCollectionResultPayload(value: unknown) {
  return (
    isRecord(value) &&
    Array.isArray(value.resources) &&
    value.resources.every(normalizeResourcePayload) &&
    isPaginationPayload(value.pagination) &&
    (value.filter === undefined || normalizeResolvedFilterPayload(value.filter))
  );
}
