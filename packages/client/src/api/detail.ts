import type { ProviderType, FetchResourceDetailOptions, Resource, ResourceDetail } from '../types';

import { fetchAPI } from './base';

export interface FetchResourceDetailResult {
  ok: boolean;
  resource: Resource<{ tracker: true; metadata: true }> | undefined;
  detail: ResourceDetail | undefined;
  timestamp: Date | undefined;
}

/**
 * Fetch resource detail from anime garden
 */
export async function fetchResourceDetail(
  provider: ProviderType,
  href: string,
  options: FetchResourceDetailOptions = {}
): Promise<FetchResourceDetailResult> {
  const resp = await fetchAPI<any>(`detail/${provider}/${href}`, undefined, options).catch(
    (_err) => {
      return undefined;
    }
  );

  return {
    ok:
      resp &&
      resp.resource !== undefined &&
      resp.detail !== undefined &&
      resp.timestamp !== undefined,
    resource: resp?.resource,
    detail: resp?.detail,
    timestamp: resp?.timestamp ? new Date(resp.timestamp) : undefined
  };
}
