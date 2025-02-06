import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export const loadingAtom = atom(false);

export const inputAtom = atom('');

export const historiesAtom = atomWithStorage(
  'animegarden:histories',
  [],
  createJSONStorage<string[]>(() => localStorage)
);
