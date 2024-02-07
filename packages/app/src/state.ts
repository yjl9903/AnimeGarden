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
