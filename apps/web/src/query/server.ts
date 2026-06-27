import { createServerFn } from '@tanstack/react-start';

import type { Collection } from '@animegarden/client';

import type { ResourcesQueryInput } from './animegarden';

function todoEmbeddedServer(): never {
  // ponytail: inline backend hook, replace with direct server calls when server moves into Start.
  throw new Error('TODO: embedded server mode');
}

export const fetchTimestampFn = createServerFn({ method: 'GET' }).handler(() =>
  todoEmbeddedServer()
);

export const fetchResourcesFn = createServerFn({ method: 'GET' })
  .validator((filter: ResourcesQueryInput) => filter)
  .handler(() => todoEmbeddedServer());

export const fetchResourceDetailFn = createServerFn({ method: 'GET' })
  .validator((input: { provider: string; providerId: string }) => input)
  .handler(() => todoEmbeddedServer());

export const fetchCollectionFn = createServerFn({ method: 'GET' })
  .validator((hash: string) => hash)
  .handler(() => todoEmbeddedServer());

export const generateCollectionFn = createServerFn({ method: 'POST' })
  .validator((collection: Collection<true>) => collection)
  .handler(() => todoEmbeddedServer());
