import type { FetchOptions, ProviderType } from '../types';

import { fetchAPI } from './base';

export async function fetchStatus(options: FetchOptions = {}) {
  const resp = await fetchAPI<{
    timestamp: string;
    providers: Record<
      ProviderType,
      { id: ProviderType; name: string; refreshedAt: string; isActive: boolean }
    >;
  }>('/', undefined, options);

  return {
    ok: true,
    timestamp: resp.timestamp,
    providers: resp.providers
  };
}
