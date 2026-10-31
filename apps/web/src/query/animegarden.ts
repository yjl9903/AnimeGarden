import {
  infiniteQueryOptions,
  mutationOptions,
  queryOptions,
  replaceEqualDeep,
  useSuspenseInfiniteQuery,
  type InfiniteData,
  type QueryClient
} from '@tanstack/react-query';
import { useCallback } from 'react';

import type { Collection, CursorOptions, FilterOptions, PresetOptions } from '@animegarden/client';

import { encodeResourcesCursor } from '@animegarden/shared';

import { ResponseStaleTime } from '~/utils/response';

import * as backend from './proxy';

// MARK: Types

/** Resource filters and pagination accepted by the web proxy, including Subject names or IDs. */
export type ResourcesQueryInput = Omit<FilterOptions, 'subject' | 'subjects'> &
  CursorOptions &
  PresetOptions & {
    subject?: number | string;
    subjects?: Array<number | string>;
  };

/** Server-function request envelope separating resource input from the transport timeout. */
export type ResourcesQueryRequest = {
  filter?: ResourcesQueryInput;
  /** Request timeout in milliseconds. */
  timeout?: number;
};

/** Transport options shared by resource queries; not part of their cache identity. */
type ResourcesQueryOptions = { timeout?: number };

/** Resource batch returned by the proxy, including unsuccessful response payloads. */
type ResourceResponse = Awaited<ReturnType<typeof backend.fetchResourcesFn>>;

// MARK: Resource version

/** Status polling and resource responses share one per-QueryClient version cache. */
export const timestampQueryKey = ['api', 'timestamp'] as const;

type TimestampResponse = Awaited<ReturnType<typeof backend.fetchTimestampFn>>;

/**
 * Builds the nonblocking version query; the root layout owns its polling interval.
 * Successful responses also revalidate idle, active resource queries that are stale or invalidated
 * while the document is visible. Resource queries never wait for this side channel.
 */
export function timestampQueryOptions() {
  return queryOptions({
    queryKey: timestampQueryKey,
    queryFn: async ({ client, signal }) => {
      const data = await backend.fetchTimestampFn({ signal });
      if (data.ok) {
        updateCurrentResourceAnchor(client, data.timestamp?.getTime());

        // Do not interrupt an in-flight query or reset fresh lists just because the version advanced.
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          void client
            .refetchQueries(
              {
                type: 'active',
                predicate: (query) =>
                  query.queryKey[0] === 'api' &&
                  query.queryKey[1] === 'resources' &&
                  query.state.fetchStatus === 'idle' &&
                  (query.state.isInvalidated ||
                    Date.now() - query.state.dataUpdatedAt >= ResponseStaleTime.List)
              },
              { cancelRefetch: false }
            )
            .catch(() => {});
        }
      }

      const previous = client.getQueryData<TimestampResponse>(timestampQueryKey);
      if (!data.ok && previous?.timestamp) {
        throw new Error(data.error?.message ?? 'Failed fetching timestamp');
      }
      return { ...data, timestamp: previous?.timestamp };
    },
    // Merge at cache commit too: a resource response can advance the version while polling settles.
    structuralSharing: (previous, next) => {
      const current = previous as TimestampResponse | undefined;
      const incoming = next as TimestampResponse;
      if (
        current?.timestamp &&
        (!incoming.timestamp || incoming.timestamp.getTime() < current.timestamp.getTime())
      ) {
        return { ...incoming, timestamp: current.timestamp };
      }
      return incoming;
    },
    gcTime: Infinity,
    staleTime: ResponseStaleTime.List,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
}

/** Reads the known version without fetching; undefined means no version has been learned yet. */
export function getCurrentResourceAnchor(queryClient: QueryClient) {
  return queryClient.getQueryData<TimestampResponse>(timestampQueryKey)?.timestamp?.getTime();
}

/**
 * Advances the known version monotonically and keeps it for the QueryClient's lifetime.
 * Callers supply actual query anchors or successful status timestamps; invalid values are ignored.
 */
export function updateCurrentResourceAnchor(queryClient: QueryClient, timestamp?: number) {
  if (
    timestamp === undefined ||
    !Number.isSafeInteger(timestamp) ||
    Number.isNaN(new Date(timestamp).getTime())
  ) {
    return;
  }

  queryClient.setQueryDefaults(timestampQueryKey, { gcTime: Infinity });

  // Learning an anchor is not a status refresh; do not postpone the side-channel freshness check.
  const updatedAt = queryClient.getQueryState(timestampQueryKey)?.dataUpdatedAt ?? 0;
  queryClient.setQueryData<TimestampResponse>(
    timestampQueryKey,
    (current) =>
      current?.timestamp && current.timestamp.getTime() >= timestamp
        ? current
        : { ok: true, timestamp: new Date(timestamp) },
    { updatedAt }
  );
}

// MARK: Resource queries

/**
 * Builds a single-batch query for previews and static resource displays.
 * Initial failures remain response payloads; refresh failures throw to retain successful cached
 * data, and older anchors never replace a newer cached batch.
 */
export function resourcesQueryOptions(
  filter: ResourcesQueryInput = {},
  options: ResourcesQueryOptions = {}
) {
  const queryKey = ['api', 'resources', 'single', filter] as const;

  return queryOptions({
    queryKey,
    queryFn: async ({ client, signal }) => {
      const data = await fetchResourceBatch(client, filter, signal, options);

      const previous = client.getQueryData<ResourceResponse>(queryKey);
      if (previous?.ok) {
        if (!data.ok) throw new Error(data.error?.message ?? 'Failed to load resources.');
        if (data.pagination.anchor < previous.pagination.anchor) return previous;
      }

      return data;
    },
    retry: false,
    staleTime: ResponseStaleTime.List
  });
}

/**
 * Fetches a batch using an explicit cursor, or the version known at dispatch when none is supplied.
 * Without a known version, the server chooses the anchor. Successful batches advance the known
 * version; this helper never probes the version first or issues a catch-up query afterward.
 */
async function fetchResourceBatch(
  client: QueryClient,
  filter: ResourcesQueryInput,
  signal: AbortSignal,
  options: ResourcesQueryOptions
) {
  const anchor = getCurrentResourceAnchor(client);
  const cursor =
    filter.cursor ?? (anchor === undefined ? undefined : encodeResourcesCursor({ anchor }));
  const data = await backend.fetchResourcesFn({
    data: { filter: { ...filter, cursor }, timeout: options.timeout },
    signal
  });
  if (data.ok) {
    updateCurrentResourceAnchor(client, data.pagination.anchor);
  }
  return data;
}

// MARK: Resource lists

/** Logical list input; continuation cursors come from its cached batches, not its callers. */
type ResourceListInput = Omit<ResourcesQueryInput, 'cursor'>;

/** Native infinite-query data; an undefined page parameter always requests the latest first batch. */
export type ResourcePages = InfiniteData<ResourceResponse>;

/**
 * Exposes native infinite-query state to the scroll sentinel.
 * Repeated scroll callbacks reuse the in-flight request instead of cancelling a refresh or continuation.
 */
export function useResourceList(filter: ResourceListInput) {
  const query = useSuspenseInfiniteQuery(resourcesListQueryOptions(filter));
  const fetchNextPage = useCallback(
    () => query.fetchNextPage({ cancelRefetch: false }),
    [query.fetchNextPage, filter]
  );

  return {
    data: flattenResourcePages(query.data),
    error: query.error ?? undefined,
    isFetchingNextPage: query.isFetching,
    fetchNextPage
  };
}

/**
 * Loads a list for navigation using its normal freshness policy.
 * A newer known version makes the cached list immediately stale, without awaiting a version probe.
 * Failed refreshes may still complete navigation with successful cached pages; Query retains the error.
 */
export async function loadResourceList(client: QueryClient, filter: ResourceListInput) {
  const options = resourcesListQueryOptions(filter);
  const previous = client.getQueryData<ResourcePages>(options.queryKey);
  const anchor = previous?.pages[0]?.pagination?.anchor;
  const known = getCurrentResourceAnchor(client);

  try {
    return await client.infiniteQuery({
      ...options,
      staleTime:
        anchor !== undefined && known !== undefined && anchor < known ? 0 : ResponseStaleTime.List
    });
  } catch (error) {
    // Read the current cache without clearing the refresh error or marking stale data as fresh.
    const cached = client.getQueryData(options.queryKey);
    if (cached?.pages[0]?.ok) return cached;
    throw error;
  }
}

/**
 * Uses one infinite-query cache for the whole list, including continuation batches.
 * `pages: 1` controls first-batch refreshes, not how many batches scrolling can retain.
 * Keep it in the shared options so loaders, observers and background refetches use the same policy.
 */
export function resourcesListQueryOptions(
  filter: ResourceListInput = {},
  options: ResourcesQueryOptions = {}
) {
  const queryKey = ['api', 'resources', 'infinite', filter] as const;
  return {
    ...infiniteQueryOptions({
      queryKey,
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage: ResourceResponse) =>
        lastPage.pagination?.nextCursor ?? undefined,
      queryFn: async ({ client, signal, pageParam }) => {
        const first = client.getQueryData<ResourcePages>(queryKey)?.pages[0];
        // Continue the server-resolved filter, not a name that could resolve differently later.
        const batchFilter =
          pageParam === undefined
            ? filter
            : { ...(first?.filter ?? filter), limit: first?.pagination?.limit ?? filter.limit };
        const data = await fetchResourceBatch(
          client,
          { ...batchFilter, cursor: pageParam },
          signal,
          options
        );
        // Initial failures remain loader data; later failures retain the successful cached pages.
        if (!data.ok && (pageParam !== undefined || first?.ok)) {
          throw new Error(data.error?.message ?? 'Failed to load resources.');
        }
        if (data.ok && pageParam !== undefined) {
          if (data.pagination.anchor !== first?.pagination?.anchor) {
            throw new Error('Resource anchor changed between batches.');
          }
          if (data.pagination.nextCursor === pageParam) {
            throw new Error('Resource cursor did not advance.');
          }
        }
        return data;
      },
      structuralSharing: (previous, next) => {
        const oldData = previous as ResourcePages | undefined;
        const newData = next as ResourcePages;
        const oldFirst = oldData?.pages[0];
        const newFirst = newData.pages[0];
        // A stale server response must not roll back the displayed list or discard its continuations.
        if (
          oldFirst?.ok &&
          newFirst?.ok &&
          newFirst.pagination.anchor < oldFirst.pagination.anchor
        ) {
          return oldData;
        }
        return replaceEqualDeep(previous, next);
      },
      retry: false,
      staleTime: ResponseStaleTime.List
    }),
    pages: 1
  };
}

/**
 * Flattens a nonempty batch sequence without deduplicating resources.
 * Keeps the first batch's resolved filters and provider timestamp, the last batch's pagination,
 * and the first response error, if any.
 */
export function flattenResourcePages(data: ResourcePages) {
  const first = data.pages[0]!;
  const last = data.pages.at(-1)!;
  return {
    ...last,
    ok: data.pages.every((page) => page.ok),
    resources: data.pages.flatMap((page) => page.resources),
    filter: first.filter,
    timestamp: first.timestamp,
    error: data.pages.find((page) => page.error)?.error
  };
}

// MARK: Resource details

/** Builds a provider-scoped resource detail query using the detail freshness policy. */
export function resourceDetailQueryOptions(provider: string, providerId: string) {
  return queryOptions({
    queryKey: ['api', 'detail', provider, providerId] as const,
    queryFn: ({ signal }) =>
      backend.fetchResourceDetailFn({ data: { provider, providerId }, signal }),
    staleTime: ResponseStaleTime.Detail
  });
}

// MARK: Collections

/** Fetches a saved collection and advances the known version from its successful result anchors. */
export function collectionQueryOptions(hash: string) {
  return queryOptions({
    queryKey: ['api', 'collection', hash] as const,
    queryFn: async ({ client, signal }) => {
      const data = await backend.fetchCollectionFn({ data: hash, signal });
      if (data.ok) {
        for (const result of data.results) {
          updateCurrentResourceAnchor(client, result.pagination.anchor);
        }
      }
      return data;
    },
    staleTime: ResponseStaleTime.List
  });
}

/** Creates a collection without populating or invalidating the collection query cache. */
export function generateCollectionMutationOptions() {
  return mutationOptions({
    mutationKey: ['api', 'collection'] as const,
    mutationFn: (collection: Collection<true>) => backend.generateCollectionFn({ data: collection })
  });
}
