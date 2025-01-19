import type { ResolvedFilterOptions } from '@animegarden/client';

import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export interface Collection {
  name: string;
  items: (Omit<ResolvedFilterOptions, 'page' | 'pageSize'> & {
    name: string;
    searchParams: string;
  })[];
}

export const collectionsAtom = atomWithStorage(
  'animegarden:collections',
  [{ name: '收藏夹', items: [] }],
  createJSONStorage<Collection[]>(() => localStorage)
);

export const currentCollectionNameAtom = atomWithStorage(
  'animegarden:cur_collection_name',
  '收藏夹',
  createJSONStorage<string>(() => localStorage)
);

export const currentCollectionAtom = atom<Collection, [Collection], void>(
  (get) => {
    const collections = get(collectionsAtom);
    const currentName = get(currentCollectionNameAtom);
    return collections.find((c) => c.name === currentName) ?? collections[0];
  },
  (get, set, newCollection: Collection) => {
    const collections = get(collectionsAtom);
    const idx = collections.findIndex((c) => c.name === newCollection.name);
    if (idx !== -1) {
      // Update current collection name
      set(currentCollectionNameAtom, newCollection.name);
      // Update collections
      const newCollections = [...collections];
      newCollections[idx] = newCollection;
      set(collectionsAtom, newCollections);
    }
  }
);
