import { z } from 'zod';
import { hash } from 'ohash';

import { version } from '../package.json';

import type {
  FetchOptions,
  Collection,
  CollectionResult,
  CollectionResourcesResult
} from './types';

import { retryFn } from './utils';
import { DefaultBaseURL, SupportProviders } from './constants';

const CollectionSchema = z.object({
  hash: z.string().optional(),
  name: z.coerce.string().default(''),
  authorization: z.string(),
  filters: z.array(
    z
      .object({
        name: z.coerce.string().default(''),
        searchParams: z.string(),
        // filters
        provider: z.enum(SupportProviders).optional(),
        duplicate: z.boolean().optional(),
        types: z.array(z.string()).optional(),
        after: z.coerce.date().optional(),
        before: z.coerce.date().optional(),
        fansubs: z.array(z.string()).optional(),
        publishers: z.array(z.string()).optional(),
        subjects: z.array(z.number()).optional(),
        search: z.array(z.string()).optional(),
        include: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        exclude: z.array(z.string()).optional()
      })
      .passthrough()
  )
});

export function parseCollection(collection: unknown): Collection<true> | undefined {
  const parsed = CollectionSchema.safeParse(collection);
  if (parsed.success) {
    // @ts-ignore
    return parsed.data;
  } else {
    return undefined;
  }
}

export function hashCollection(collection: Collection<true>) {
  const sorted = [...collection.filters];
  sorted.sort((lhs, rhs) => lhs.searchParams.localeCompare(rhs.searchParams));
  const filters = sorted.map((f) => {
    const r = { ...f };
    // @ts-ignore
    delete r.name;
    // @ts-ignore
    delete r.searchParams;
    // @ts-ignore
    delete r.resources;
    // @ts-ignore
    delete r.complete;
    return r;
  });
  return hash(filters);
}

export async function generateCollection(
  collection: Collection<true>,
  options: FetchOptions = {}
): Promise<CollectionResult<true, false> | undefined> {
  const fetch = options?.fetch ?? global.fetch;
  const { baseURL = DefaultBaseURL, retry = 0 } = options;

  const url = new URL('collection', baseURL);
  // @ts-ignore
  const headers = new Headers(options.headers);
  if (!headers.get('user-agent')) {
    headers.set(`user-agent`, `animegarden@${version}`);
  }

  const body = JSON.stringify({
    ...collection,
    filters: collection.filters.map((f) => ({ ...f, resources: undefined, complete: undefined }))
  });

  const resp = await retryFn(async () => {
    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body,
      signal: options.signal
    });
    if (resp.ok) {
      const json = await resp.json();
      return json as any;
    }
    throw new Error(`Failed connecting ${url.toString()}`);
  }, retry);

  if (resp.status === 'OK') {
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
  const fetch = options?.fetch ?? global.fetch;
  const { baseURL = DefaultBaseURL, retry = 0 } = options;

  const url = new URL(`collection/${hash}`, baseURL);

  // @ts-ignore
  const headers = new Headers(options.headers);
  if (!headers.get('user-agent')) {
    headers.set(`user-agent`, `animegarden@${version}`);
  }

  const resp = await retryFn(async () => {
    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: options.signal
    });
    if (resp.ok) {
      const json = await resp.json();
      return json as any;
    }
    throw new Error(`Failed connecting ${url.toString()}`);
  }, retry);

  if (resp.status === 'OK') {
    return {
      ok: true,
      ...resp,
      timestamp: new Date(resp.timestamp)
    };
  }

  return undefined;
}
