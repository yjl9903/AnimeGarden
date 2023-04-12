import { ElementCategory } from '../element';
import { inRange, isNumericString } from '../utils';
import { Token, TokenCategory, TokenFlag, findNextToken, findPrevToken } from '../token';

import { ParserContext, setResult } from './context';
import { getNumberFromOrdinal, isMatchTokenCategory } from './utils';

export function checkAnimeSeasonKeyword(context: ParserContext, position: number) {
  const tokens = context.tokens;
  const token = tokens[position];
  const prevToken = findPrevToken(tokens, position, TokenFlag.NotDelimiter);
  if (inRange(tokens, prevToken)) {
    const num = getNumberFromOrdinal(tokens[prevToken].content);
    if (num) {
      setAnimeSeason(tokens[prevToken], token, num);
      return;
    }
  }

  const nextToken = findNextToken(tokens, position, TokenFlag.NotDelimiter);
  if (!inRange(tokens, nextToken) || isNumericString(tokens[nextToken].content)) {
    return undefined;
  }

  return setAnimeSeason(token, tokens[nextToken], tokens[nextToken].content);

  function setAnimeSeason(first: Token, second: Token, content: string) {
    first.category = TokenCategory.Identifier;
    second.category = TokenCategory.Identifier;
    setResult(context, ElementCategory.AnimeSeason, content);
  }
}

/**
 * A Method to find the correct volume/episode number when prefixed (i.e. Vol.4).
 */
export function checkExtentKeyword(
  context: ParserContext,
  category: ElementCategory,
  position: number
) {
  const tokens = context.tokens;

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
}

export function indexOfDigit(str: string) {
  for (let i = 0; i < str.length; i++) {
    if (/[0-9]/.test(str[i])) {
      return i;
    }
  }
  return -1;
}

function matchEpisodePatterns(word: string, token: Token) {}
