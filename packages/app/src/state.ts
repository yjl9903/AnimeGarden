import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export const loading = atom<boolean>(false);

export const histories = persistentAtom<string[]>('animegarden:histories', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});
