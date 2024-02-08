import type { ResolvedFilterOptions } from 'animegarden';

import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export const store = getDefaultStore();

export const loadingAtom = atom(false);

export const inputAtom = atomWithStorage(
  'animegarden:search_input',
  '',
  createJSONStorage<string>(() => sessionStorage)
);

export const historiesAtom = atomWithStorage(
  'animegarden:histories',
  [],
  createJSONStorage<string[]>(() => localStorage)
);

export const preferFansubsAtom = atomWithStorage(
  'animegarden:fansubs',
  [],
  createJSONStorage<string[]>(() => localStorage)
);

export const collectionsAtom = atomWithStorage(
  'animegarden:collections',
  [{ name: '收藏夹', items: [] }],
  createJSONStorage<Array<{ name: string; items: ResolvedFilterOptions[] }>>(() => localStorage)
);

export const currentCollectionsAtom = atomWithStorage(
  'animegarden:cur_collections',
  '收藏夹',
  createJSONStorage<string>(() => localStorage)
);
