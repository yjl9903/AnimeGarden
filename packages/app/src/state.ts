import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export const loading = atom<boolean>(false);

export const histories = persistentAtom<string[]>('animegarden:histories', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});

export const preferFansubs = persistentAtom<Set<string>>('animegarden:fansubs', new Set(), {
  encode: (t) => JSON.stringify([...t]),
  decode: (t) => new Set(JSON.parse(t) as string[])
});

export const committerDate = persistentAtom<Date | undefined>(
  'animegarden:commiter_date',
  undefined,
  {
    encode: (t) => JSON.stringify(t),
    decode: (t) => {
      const r = JSON.parse(t);
      if (r) {
        const d = new Date(r as any);
        if (!isNaN(d.getTime())) {
          return d;
        }
      }
      return undefined;
    }
  }
);
