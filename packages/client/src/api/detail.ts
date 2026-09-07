import type { ProviderType, FetchResourceDetailOptions, Resource, ResourceDetail } from '../types';

import { AnimeGardenError, type ClientResult, toClientFailure } from '../error';

import { fetchAPI } from './base';
import { isResourceDetailPayload, normalizeResourcePayload } from './validation';

export interface ResourceDetailData {
  resource: Resource<{ tracker: true; metadata: true }>;
  detail: ResourceDetail | undefined;
  timestamp: Date;
}

export type FetchResourceDetailResult = ClientResult<ResourceDetailData>;

/**
 * Fetch resource detail from anime garden
 */
export async function fetchResourceDetail(
  provider: ProviderType,
  href: string,
  options: FetchResourceDetailOptions = {}
): Promise<FetchResourceDetailResult> {
  if (!href.trim()) {
    return toClientFailure(AnimeGardenError.fromBadRequest('Resource detail id is required'));
  }

  try {
    const resp = await fetchAPI<any>(`detail/${provider}/${href}`, undefined, options);
    if (
      !resp ||
      typeof resp !== 'object' ||
      Array.isArray(resp) ||
      !normalizeResourcePayload(resp.resource) ||
      (resp.detail !== undefined && !isResourceDetailPayload(resp.detail)) ||
      !(resp.timestamp instanceof Date)
    ) {
      throw AnimeGardenError.fromInvalidResponse(
        `Invalid response /detail/${provider}/${href}`,
        resp
      );
    }

    return {
      ok: true,
      resource: resp.resource,
      detail: resp.detail,
      timestamp: resp.timestamp
    };
  } catch (error) {
    return toClientFailure(error);
  }
}

export async function fetchResourceDetailByInfoHash(
  infoHash: string,
  options: FetchResourceDetailOptions = {}
): Promise<FetchResourceDetailResult> {
  const hash = infoHash.trim();
  if (!hash) {
    return toClientFailure(AnimeGardenError.fromBadRequest('Info hash is required'));
  }

  try {
    const resp = await fetchAPI<any>(
      `detail/infohash/${encodeURIComponent(hash)}`,
      undefined,
      options
    );
    if (
      !resp ||
      typeof resp !== 'object' ||
      Array.isArray(resp) ||
      !normalizeResourcePayload(resp.resource) ||
      (resp.detail !== undefined && !isResourceDetailPayload(resp.detail)) ||
      !(resp.timestamp instanceof Date)
    ) {
      throw AnimeGardenError.fromInvalidResponse(`Invalid response /detail/infohash/${hash}`, resp);
    }

    return {
      ok: true,
      resource: resp.resource,
      detail: resp.detail,
      timestamp: resp.timestamp
    };
  } catch (error) {
    return toClientFailure(error);
  }
}
