import type { ParsedResult } from './types';

export function isNumericString(text: string) {
  return /^\d+$/.test(text);
}

export function mergeResult(source: ParsedResult, income: ParsedResult) {
  return {
    ...source,
    ...income
  };
}
