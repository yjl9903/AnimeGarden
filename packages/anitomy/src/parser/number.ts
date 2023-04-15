import { ParserContext } from './context';
import { isMatchTokenCategory } from './utils';

import { TokenCategory, TokenFlag, findPrevToken } from '../token';
import { setEpisodeNumber } from './episode';
import { isTokenIsolated } from './parser';

export const AnimeYearMin = 1900;
export const AnimeYearMax = 2100;
export const EpisodeNumberMax = AnimeYearMax - 1;
export const VolumeNumberMax = 50;

export function indexOfDigit(str: string) {
  for (let i = 0; i < str.length; i++) {
    if (isDigit(str[i])) {
      return i;
    }
  }
  return -1;
}

export function isDigit(str: string) {
  return /^[0-9]$/.test(str);
}

export function searchForEquivalentNumbers(context: ParserContext, tokens: number[]) {
  return false;
}

export function searchForSeparatedNumbers(context: ParserContext, tokens: number[]) {
  return false;
}

/**
 * Searches for isolated numbers in a list of tokens, e.g. [01].
 */
export function searchForIsolatedEpisodeNumber(context: ParserContext, tokens: number[]) {
  const isolated = tokens.filter(
    (it) => context.tokens[it].enclosed && isTokenIsolated(context, it)
  );
  for (const it of isolated.reverse()) {
    if (setEpisodeNumber(context, context.tokens[it].content, context.tokens[it], true)) {
      return true;
    }
  }
  return false;
}

/**
 * Searches for the last number token in a list of tokens.
 */
export function searchForLastNumber(context: ParserContext, tokens: number[]) {
  for (const it of tokens) {
    // Assuming that episode number always comes after the title,
    // the first token cannot be what we're looking for
    if (it === 0) continue;
    if (context.tokens[it].enclosed) continue;

    // Ignore if it's the first non-enclosed, non-delimiter token
    if (
      context.tokens.slice(0, it).every((t) => t.enclosed || t.category === TokenCategory.Delimiter)
    ) {
      continue;
    }

    const prevToken = findPrevToken(context.tokens, it, TokenFlag.NotDelimiter);
    if (isMatchTokenCategory(TokenCategory.Unknown, context.tokens[prevToken])) {
      const prevContent = context.tokens[prevToken].content;
      if (prevContent === 'Movie' || prevContent === 'Part') {
        continue;
      }
    }

    // We'll use this number after all
    if (setEpisodeNumber(context, context.tokens[it].content, context.tokens[it], true)) {
      return true;
    }
  }
  return false;
}

export function isValidEpisodeNumber(num: string) {
  const temp = [];
  for (let i = 0; i < num.length && /[0-9\.]/.test(num[i]); i++) {
    temp.push(num[i]);
  }
  return temp.length > 0 && parseFloat(temp.join('')) <= EpisodeNumberMax;
}
