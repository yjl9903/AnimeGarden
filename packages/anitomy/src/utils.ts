import type { ParsedResult } from './types';

export function mergeResult(source: ParsedResult, income: ParsedResult) {
  return {
    ...source,
    ...income
  };
}
