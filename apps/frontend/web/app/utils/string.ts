import type { ResolvedFilterOptions } from '@animegarden/client';

export function removeQuote(words: string[]) {
  return words.map((w) => w.replace(/^(\+|-)?"([^"]*)"$/, '$1$2'));
}

export function parseSize(num: number) {
  if (num === 0) {
    return '';
  }
  if (num < 1024) {
    return `${num} KB`;
  }
  if (num < 1024 * 1024) {
    return `${(num / 1024).toFixed(2)} MB`;
  }
  return `${(num / 1024 / 1024).toFixed(2)} GB`;
}

export function generateFilterTitle(filter: ResolvedFilterOptions) {}
