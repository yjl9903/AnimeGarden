import { z } from 'zod';
import { hash } from 'ohash';

import type { Collection } from './types';

import { SupportProviders } from './constants';

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
