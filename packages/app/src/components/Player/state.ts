import { atom } from 'nanostores';

export const PlayerState = atom<{ open: boolean; file?: string; loading: boolean }>({
  open: false,
  loading: true
});
