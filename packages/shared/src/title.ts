import { fullToHalf, tradToSimple } from 'simptrad';

export function normalizeTitle(title: string) {
  return fullToHalf(tradToSimple(title), { punctuation: true });
}
