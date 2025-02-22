import type { Collection } from '@animegarden/client';

import { atom } from 'jotai';
import { MiniDb } from 'jotai-minidb';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

const collectionDb = !import.meta.env.SSR
  ? new MiniDb<Collection<true>>({
      name: 'animegarden:collections',
      version: 0,
      initialData: {
        收藏夹: {
          hash: undefined,
          name: '收藏夹',
          authorization: '',
          filters: []
        }
      }
    })
  : undefined;

export const collectionsAtom = collectionDb?.items!;

export const currentCollectionNameAtom = atomWithStorage(
  'animegarden:cur_collection_name',
  '收藏夹',
  createJSONStorage<string>(() => localStorage)
);

export const currentCollectionAtom = atom<Collection | undefined, [Collection], void>(
  (get) => {
    collectionsAtom && get(collectionsAtom!);
    const currentName = get(currentCollectionNameAtom);
    const current = currentName && collectionDb ? get(collectionDb!.item(currentName)) : undefined;
    return current;
  },
  (_get, set, newCollection: Collection) => {
    set(currentCollectionNameAtom, newCollection.name);
    set(collectionDb!.set, newCollection.name, newCollection);
  }
);

export const addCollectionItemAtom = atom(
  null,
  (get, set, collection: Collection<true>, value: Collection<true>['filters'][0]) => {
    const idx = collection.filters.findIndex((i) => i.searchParams === value.searchParams);
    if (idx === -1) {
      set(collectionDb!.set, collection.name, {
        ...collection,
        filters: [value, ...collection.filters]
      });
    }
  }
);

export const updateCollectionAtom = atom(
  null,
  (get, set, collection: Collection<true>, value: Partial<Collection<true>>) => {
    set(collectionDb!.set, collection.name, { ...collection, ...value });
  }
);

export const updateCollectionItemAtom = atom(
  null,
  (get, set, collection: Collection<true>, value: Collection<true>['filters'][0]) => {
    const idx = collection.filters.findIndex((i) => i.searchParams === value.searchParams);
    if (idx !== -1) {
      set(collectionDb!.set, collection.name, {
        ...collection,
        filters: [...collection.filters.slice(0, idx), value, ...collection.filters.slice(idx + 1)]
      });
    }
  }
);

export const deleteCollectionItemAtom = atom(
  null,
  (get, set, collection: Collection<true>, value: Collection<true>['filters'][0]) => {
    const idx = collection.filters.findIndex((i) => i.searchParams === value.searchParams);
    if (idx !== -1) {
      set(collectionDb!.set, collection.name, {
        ...collection,
        filters: [...collection.filters.slice(0, idx), ...collection.filters.slice(idx + 1)]
      });
    }
  }
);
