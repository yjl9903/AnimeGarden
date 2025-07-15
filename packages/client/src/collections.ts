import { z } from 'zod';
import { serialize } from 'ohash';

import type { Collection } from './types';

import { SupportPresets, SupportProviders } from './constants';

const CollectionSchema = z.object({
  hash: z.string().optional(),
  name: z.coerce.string().default(''),
  authorization: z.string(),
  filters: z
    .array(
      z
        .object({
          name: z.coerce.string().default(''),
          searchParams: z.string(),
          // filters
          preset: z.enum(SupportPresets).optional(),
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
    .min(1)
    .max(50)
});

export function parseCollection(collection: unknown): Collection<true> | undefined {
  const parsed = CollectionSchema.safeParse(collection);
  if (parsed.success) {
    return parsed.data;
  } else {
    return undefined;
  }
}

export async function hashCollection(collection: Collection<true>) {
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

  const body = serialize(filters);
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const digest = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(digest));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
