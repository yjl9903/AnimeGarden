import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

export const loading = atom<boolean>(false);

export const histories = persistentAtom<string[]>('animegarden:histories', [], {
  encode: JSON.stringify,
  decode: JSON.parse
});

export function pushHistory(text: string) {
  // Filter old history item which is the substring of the current input
  const oldHistories = histories.get().filter((o) => !text.includes(o));
  // Remove duplicate items
  const newHistories = [...new Set([text, ...oldHistories])].slice(0, 10);
  // Set histories
  histories.set(newHistories);
}

export function removeHistory(item: string) {
  const filterHistories = histories.get().filter((content) => content !== item);
  histories.set(filterHistories);
}

export function clearHistories() {
  histories.set([]);
}
