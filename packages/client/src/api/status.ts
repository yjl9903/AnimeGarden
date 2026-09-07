import type { FetchOptions, ProviderType } from '../types';

import { SupportProviders } from '../constants';
import { AnimeGardenError, type ClientResult, toClientFailure } from '../error';

import { fetchAPI } from './base';
import { isRecord } from './validation';

export interface StatusData {
  timestamp: Date;
  providers: Record<
    ProviderType,
    { id: ProviderType; name: string; refreshedAt: string; isActive: boolean }
  >;
}

export async function fetchStatus(options: FetchOptions = {}): Promise<ClientResult<StatusData>> {
  try {
    const resp = await fetchAPI<StatusData>('/', undefined, options);
    if (
      !resp ||
      typeof resp !== 'object' ||
      Array.isArray(resp) ||
      !(resp.timestamp instanceof Date) ||
      !isStatusProvidersPayload(resp.providers)
    ) {
      throw AnimeGardenError.fromInvalidResponse('Invalid response /', resp);
    }

    return {
      ok: true,
      timestamp: resp.timestamp,
      providers: resp.providers
    };
  } catch (error) {
    return toClientFailure(error);
  }
}

function isStatusProvidersPayload(value: unknown): value is StatusData['providers'] {
  if (!isRecord(value) || !SupportProviders.every((provider) => provider in value)) return false;

  return Object.entries(value).every(
    ([provider, item]) =>
      isRecord(item) &&
      item.id === provider &&
      typeof item.name === 'string' &&
      typeof item.refreshedAt === 'string' &&
      typeof item.isActive === 'boolean'
  );
}
