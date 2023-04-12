import type { Token } from '../token';
import type { ElementCategory } from '../element';
import type { AnitomyOptions, ParsedResult } from '../types';

export interface ParserContext {
  readonly result: ParsedResult;

  readonly options: AnitomyOptions;

  readonly tokens: Token[];

  isEpisodeKeywordsFound: boolean;
}

export function setResult(context: ParserContext, category: ElementCategory, word: string) {
  context.result[category] = word;
}

export function hasResult(context: ParserContext, category: ElementCategory) {
  const value = context.result[category];
  return value !== undefined && value !== null && value !== '';
}
