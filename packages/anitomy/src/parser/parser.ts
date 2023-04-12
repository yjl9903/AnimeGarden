import { ElementCategory } from '../element';
import { inRange, isNumericString } from '../utils';
import { Token, TokenCategory, TokenFlag, findNextToken, findPrevToken } from '../token';

import { indexOfDigit } from './number';
import { ParserContext, setResult } from './context';
import { matchVolumePatterns, setVolumeNumber } from './volume';
import { matchEpisodePatterns, setEpisodeNumber } from './episode';
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
    return false;
  }
  if (indexOfDigit(tokens[nextToken].content) !== 0) {
    return false;
  }

  switch (category) {
    case ElementCategory.EpisodeNumber:
      if (!matchEpisodePatterns(context, tokens[nextToken].content, tokens[nextToken])) {
        setEpisodeNumber(context, tokens[nextToken].content, tokens[nextToken], false);
      }
      break;
    case ElementCategory.VolumeNumber:
      if (!matchVolumePatterns(context, tokens[nextToken].content, tokens[nextToken])) {
        setVolumeNumber(context, tokens[nextToken].content, tokens[nextToken], false);
      }
      break;
  }

  token.category = TokenCategory.Identifier;
  return true;
}

export function isTokenIsolated(context: ParserContext, position: number) {
  return false;
}
