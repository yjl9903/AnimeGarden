import type { ParsedResult } from './types';

export function inRange<T>(list: T[], idx: number) {
  return 0 <= idx && idx < list.length;
}

export function isNumericString(text: string) {
  return /^\d+$/.test(text);
}

export function trim(text: string, removal: string[]) {
  let start = 0,
    end = text.length - 1;
  while (start <= end && removal.includes(text[start])) {
    start++;
  }
  while (end >= start && removal.includes(text[end])) {
    end--;
  }
  return text.slice(start, end + 1);
}

export function mergeResult(source: ParsedResult, income: ParsedResult = {}) {
  return {
    ...source,
    ...income
  };
}
