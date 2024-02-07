import { atom } from 'jotai';

export const playerAtom = atom<{ open: boolean; file?: string; loading: boolean }>({
  open: false,
  loading: true
});
