import { mutationOptions, queryOptions } from '@tanstack/react-query';

import type {
  Collection,
  FilterOptions,
  PaginationOptions,
  PresetOptions
} from '@animegarden/client';

import { ResponseStaleTime } from '~/utils/response';

import * as proxyBackend from './proxy';
import * as serverBackend from './server';

type BackendMode = 'proxy' | 'embedded';

type ResourceSubjectInput = number | string;

export type ResourcesQueryInput = Omit<FilterOptions, 'subject' | 'subjects'> &
  PaginationOptions &
  PresetOptions & {
    subject?: ResourceSubjectInput;
    subjects?: ResourceSubjectInput[];
  };

const backendMode: BackendMode = 'proxy';

function getBackend() {
  if (backendMode === 'embedded') {
    return serverBackend;
  }

  return proxyBackend;
}

export function timestampQueryOptions() {
  return queryOptions({
    queryKey: ['api', 'timestamp'] as const,
    queryFn: ({ signal }) => getBackend().fetchTimestampFn({ signal }),
    staleTime: ResponseStaleTime.List
  });
}

export function resourcesQueryOptions(filter: ResourcesQueryInput = {}) {
  return queryOptions({
    queryKey: ['api', 'resources', filter] as const,
    queryFn: ({ signal }) => getBackend().fetchResourcesFn({ data: filter, signal }),
    staleTime: ResponseStaleTime.List
  });
}

export function resourceDetailQueryOptions(provider: string, providerId: string) {
  return queryOptions({
    queryKey: ['api', 'detail', provider, providerId] as const,
    queryFn: ({ signal }) =>
      getBackend().fetchResourceDetailFn({ data: { provider, providerId }, signal }),
    staleTime: ResponseStaleTime.Detail
  });
}

export function collectionQueryOptions(hash: string) {
  return queryOptions({
    queryKey: ['api', 'collection', hash] as const,
    queryFn: ({ signal }) => getBackend().fetchCollectionFn({ data: hash, signal }),
    staleTime: ResponseStaleTime.List
  });
}

export function generateCollectionMutationOptions() {
  return mutationOptions({
    mutationKey: ['api', 'collection'] as const,
    mutationFn: (collection: Collection<true>) =>
      getBackend().generateCollectionFn({ data: collection })
  });
}
