import { persistentAtom } from '@nanostores/persistent';

export const histories = persistentAtom<string[]>('animegarden:histories', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});
