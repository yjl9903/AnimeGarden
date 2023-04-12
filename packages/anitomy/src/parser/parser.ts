import type { ParsedResult } from '../types';

import { ElementCategory } from '../element';
import { inRange, isNumericString } from '../utils';
import { Token, TokenCategory, TokenFlag, findNextToken, findPrevToken } from '../token';

import { getNumberFromOrdinal, isMatchTokenCategory } from './utils';

export function checkAnimeSeasonKeyword(tokens: Token[], position: number) {
  const token = tokens[position];
  const prevToken = findPrevToken(tokens, position, TokenFlag.NotDelimiter);
  if (inRange(tokens, prevToken)) {
    const num = getNumberFromOrdinal(tokens[prevToken].content);
    if (num) {
      return resolveAnimeSeason(tokens[prevToken], token, num);
    }
  }

  const nextToken = findNextToken(tokens, position, TokenFlag.NotDelimiter);
  if (!inRange(tokens, nextToken) || isNumericString(tokens[nextToken].content)) {
    return undefined;
  }

  return resolveAnimeSeason(token, tokens[nextToken], tokens[nextToken].content);

  function resolveAnimeSeason(first: Token, second: Token, content: string): ParsedResult {
    first.category = TokenCategory.Identifier;
    second.category = TokenCategory.Identifier;
    return { [ElementCategory.AnimeSeason]: content };
  }
}

/**
 * A Method to find the correct volume/episode number when prefixed (i.e. Vol.4).
 */
export function checkExtentKeyword(category: ElementCategory, tokens: Token[], position: number) {
  const result: ParsedResult = {};
  const token = tokens[position];
  const nextToken = findNextToken(tokens, position, TokenFlag.NotDelimiter);
  if (!isMatchTokenCategory(TokenCategory.Unknown, tokens[nextToken])) {
    return undefined;
  }
  if (indexOfDigit(tokens[nextToken].content) !== 0) {
    return undefined;
  }

  switch (category) {
    case ElementCategory.EpisodeNumber:
      break;
    case ElementCategory.VolumeNumber:
      break;
  }

  token.category = TokenCategory.Identifier;
  return result;

  function indexOfDigit(str: string) {
    for (let i = 0; i < str.length; i++) {
      if (/[0-9]/.test(str[i])) {
        return i;
      }
    }
    return -1;
  }
}

function matchEpisodePatterns(word: string, token: Token) {}
