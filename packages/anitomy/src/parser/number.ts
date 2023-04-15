import { ParserContext } from './context';
import { isTokenIsolated } from './parser';
import { setEpisodeNumber } from './episode';
import { isDashCharacter, isMatchTokenCategory } from './utils';

import { TokenCategory, TokenFlag, findNextToken, findPrevToken } from '../token';
import { isNumericString } from '../utils';

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

/**
 * Searches for equivalent number in a list of tokens. e.g. 08(114)
 */
export function searchForEquivalentNumbers(context: ParserContext, tokens: number[]) {
  for (const it of tokens) {
    if (isTokenIsolated(context, it) || !isValidEpisodeNumber(context.tokens[it].content)) {
      continue;
    }

    let nextToken = findNextToken(context.tokens, it, TokenFlag.NotDelimiter);
    if (isMatchTokenCategory(TokenCategory.Bracket, context.tokens[nextToken])) {
      nextToken = findNextToken(
        context.tokens,
        nextToken,
        TokenFlag.Enclosed,
        TokenFlag.NotDelimiter
      );
      if (isMatchTokenCategory(TokenCategory.Unknown, context.tokens[nextToken])) {
        // Check if it's an isolated number
        if (
          isTokenIsolated(context, nextToken) &&
          isNumericString(context.tokens[nextToken].content) &&
          isValidEpisodeNumber(context.tokens[nextToken].content)
        ) {
          // Not generate alt episode number
          // setEpisodeNumber(context, context.tokens[it].content, context.tokens[it], true);
          setEpisodeNumber(
            context,
            context.tokens[nextToken].content,
            context.tokens[nextToken],
            true
          );
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Searches for separated numbers in a list of tokens
 */
export function searchForSeparatedNumbers(context: ParserContext, tokens: number[]) {
  for (const it of tokens) {
    const prevToken = findPrevToken(context.tokens, it, TokenFlag.NotDelimiter);

    // See if the number has a preceding "-" separator
    if (
      isMatchTokenCategory(TokenCategory.Unknown, context.tokens[prevToken]) &&
      isDashCharacter(context.tokens[prevToken].content[0])
    ) {
      if (setEpisodeNumber(context, context.tokens[it].content, context.tokens[it], true)) {
        context.tokens[prevToken].category = TokenCategory.Identifier;
        return true;
      }
    }
  }
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
