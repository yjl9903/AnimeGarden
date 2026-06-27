import { createServerFn } from '@tanstack/react-start';

import { APP_HOST, FEED_HOST, WEB_SERVER_URL } from '~build/env';

import {
  type Collection,
  type FetchResourcesOptions,
  type ProviderType,
  fetchCollection as rawFetchCollection,
  fetchResourceDetail as rawFetchResourceDetail,
  fetchResources as rawFetchResources,
  fetchStatus as rawFetchStatus,
  generateCollection as rawGenerateCollection
} from '@animegarden/client';

import { serializeError } from '~/utils/error';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

import type { ResourcesQueryInput } from './animegarden';
import { resolveSubjectsByName } from './subject.server';

const ofetch = async (url: string | RequestInfo, init?: RequestInit) => {
  if (import.meta.env.DEV && import.meta.env.SSR && import.meta.env.HTTPS_PROXY) {
    const { ProxyAgent } = await import('undici');
    return fetch(url, {
      ...init,
      referrer: `https://${APP_HOST}/`,
      // @ts-ignore undici's dispatcher is not in the DOM fetch type.
      dispatcher: new ProxyAgent(import.meta.env.HTTPS_PROXY)
    });
  }

  return fetch(url, init);
};

const transientAPIErrorStatuses = new Set([502, 503, 504]);

function getProxyFetchOptions(timeout?: number) {
  return {
    fetch: withTransientAPIErrorRetry,
    baseURL: import.meta.env.SSR && WEB_SERVER_URL ? WEB_SERVER_URL : `https://${FEED_HOST}/`,
    retry: 0,
    timeout
  } as const;
}

async function withTransientAPIErrorRetry(url: string | RequestInfo, init?: RequestInit) {
  const response = await ofetch(url, init);
  const method = init?.method?.toUpperCase() ?? 'GET';

  if (
    init?.signal?.aborted ||
    (method !== 'GET' && method !== 'HEAD') ||
    !transientAPIErrorStatuses.has(response.status)
  ) {
    return response;
  }

  console.warn('[API]', 'retry transient response', response.status, url.toString());
  return ofetch(url, init);
}

let lastTimestamp!: Date;

function setTimestamp<T extends { timestamp?: Date } | undefined>(resp: T) {
  if (resp?.timestamp) {
    lastTimestamp = resp.timestamp;
  } else if (resp) {
    resp.timestamp = lastTimestamp;
  }

  return resp;
}

async function normalizeResourceDescription(description: string) {
  const { normalizeDescription } = await import('@animegarden/scraper');
  return normalizeDescription(description);
}

async function resolveResourcesFilter(filter: ResourcesQueryInput) {
  const { subject, subjects, ...rest } = filter;
  const subjectIds: number[] = [];
  const names: string[] = [];

  for (const value of [subject, ...(subjects ?? [])]) {
    if (value === undefined) continue;
    if (typeof value === 'number') {
      subjectIds.push(value);
    } else {
      names.push(value);
    }
  }

  const resolvedSubjects = names.length > 0 ? await resolveSubjectsByName(names) : [];
  const resolvedIds = [
    ...new Set([...subjectIds, ...resolvedSubjects.map((subject) => subject.id)])
  ];

  return {
    ...rest,
    subjects: resolvedIds.length > 0 ? resolvedIds : undefined // Unknown subject names are intentionally dropped; the returned filter should not echo them.
  } as FetchResourcesOptions;
}

export const fetchTimestampFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const resp = await rawFetchStatus({
      ...getProxyFetchOptions(10 * 1000),
      signal: AbortSignal.timeout(10 * 1000)
    });
    if (resp.ok && resp.timestamp) {
      setTimestamp(resp);
      await setCacheControl(ResponseCacheControl.List);

      return {
        ok: true,
        timestamp: resp.timestamp
      };
    }
  } catch (error) {
    console.error('fetchTimestamp', error);
  }

  await setErrorResponse();

  return {
    ok: false,
    timestamp: lastTimestamp
  };
});

export const fetchResourcesFn = createServerFn({ method: 'GET' })
  .validator((filter: ResourcesQueryInput) => filter)
  .handler(async ({ data: filter = {} }) => {
    try {
      const resolvedFilter = await resolveResourcesFilter(filter);
      const resp = await rawFetchResources({
        ...getProxyFetchOptions(30 * 1000),
        ...resolvedFilter,
        tracker: true,
        metadata: true
      });

      setTimestamp(resp);
      resp.error = serializeError(resp.error);
      if (resp.ok) {
        await setCacheControl(ResponseCacheControl.List);
      } else {
        await setErrorResponse();
      }

      return resp;
    } catch (error) {
      console.error('[API]', 'fetchResources', filter, error);
      await setErrorResponse();

      return {
        ok: false,
        resources: [],
        pagination: undefined,
        filter: undefined,
        timestamp: lastTimestamp,
        error: serializeError(error)
      };
    }
  });

export const fetchResourceDetailFn = createServerFn({ method: 'GET' })
  .validator((input: { provider: string; providerId: string }) => input)
  .handler(async ({ data }) => {
    const { provider, providerId } = data;

    try {
      const resp = await rawFetchResourceDetail(provider as ProviderType, providerId, {
        ...getProxyFetchOptions(30 * 1000)
      });

      setTimestamp(resp);
      if (resp.ok) {
        await setCacheControl(ResponseCacheControl.Detail);
      } else {
        await setErrorResponse();
      }

      const description = resp?.detail?.description
        ? await normalizeResourceDescription(resp.detail.description)
        : undefined;

      return {
        ...resp,
        description
      };
    } catch (error) {
      console.error('[API]', 'fetchResourceDetail', provider, providerId, error);
      await setErrorResponse();

      return {
        ok: false,
        resource: undefined,
        detail: undefined,
        timestamp: lastTimestamp,
        description: undefined
      };
    }
  });

export const fetchCollectionFn = createServerFn({ method: 'GET' })
  .validator((hash: string) => hash)
  .handler(async ({ data: hash }) => {
    try {
      const resp = await rawFetchCollection(hash, {
        ...getProxyFetchOptions(30 * 1000)
      });

      setTimestamp(resp);
      if (resp?.ok) {
        await setCacheControl(ResponseCacheControl.List);
      } else {
        await setErrorResponse();
      }

      return resp;
    } catch (error) {
      console.error('[API]', 'fetchCollection', hash, error);
      await setErrorResponse();

      return undefined;
    }
  });

export const generateCollectionFn = createServerFn({ method: 'POST' })
  .validator((collection: Collection<true>) => collection)
  .handler(async ({ data: collection }) => {
    try {
      return await rawGenerateCollection(collection, {
        ...getProxyFetchOptions()
      });
    } catch (error) {
      console.error('[API]', 'generateCollection', collection, error);

      return null;
    }
  });
