import { Fansubs } from '../keyword';
import { ElementCategory } from '../element';
import { inRange, isNumericString, trim } from '../utils';
import { Token, TokenCategory, TokenFlag, findNextToken, findPrevToken } from '../token';

import { indexOfDigit } from './number';
import { ParserContext, setResult } from './context';
import { matchVolumePatterns, setVolumeNumber } from './volume';
import { matchEpisodePatterns, setEpisodeNumber } from './episode';
import { getNumberFromOrdinal, isMatchTokenCategory } from './utils';

/**
 * Finds and sets the anime season keyword.
 */
export function checkAndSetAnimeSeasonKeyword(context: ParserContext, position: number) {
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
  if (!inRange(tokens, nextToken) || !isNumericString(tokens[nextToken].content)) {
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
 * Added by https://github.com/yjl9903/AnimeGarden
 */
export function checkAndSetAnimeSeason(context: ParserContext, position: number) {
  const token = context.tokens[position];

  // S02, S2, S-2
  if (matchPrefixS()) {
    return true;
  }

  // 第2季
  if (matchPrefixChinese()) {
    return true;
  }

  // 第二季
  if (matchFullChinese()) {
    return true;
  }

  return false;

  function matchPrefixS() {
    const RE = /^S-?(\d{1,3})$/;
    const match = RE.exec(token.content);
    if (!match) return false;
    // context.tokens[position].category = TokenCategory.Identifier;
    setResult(context, ElementCategory.AnimeSeason, match[1]);
    return true;
  }

  function matchPrefixChinese() {
    const RE = /^第(\d+)季$/;
    const match = RE.exec(token.content);
    if (!match) return false;
    // context.tokens[position].category = TokenCategory.Identifier;
    setResult(context, ElementCategory.AnimeSeason, match[1]);
    return true;
  }

  function matchFullChinese() {
    const RE = /^第(十?[零一二三四五六七八九十])季$/;
    const match = RE.exec(token.content);
    if (!match) return false;
    // context.tokens[position].category = TokenCategory.Identifier;
    setResult(context, ElementCategory.AnimeSeason, extractNumber(match[1]));
    return true;

    function extractNumber(word: string) {
      const DICT = {
        零: '0',
        一: '1',
        二: '2',
        三: '3',
        四: '4',
        五: '5',
        六: '6',
        七: '7',
        八: '8',
        九: '9',
        十: '10'
      } as Record<string, string>;
      if (word.length === 1) {
        return DICT[word[0]]!;
      } else {
        return '1' + DICT[word[1]]!;
      }
    }
  }
}

/**
 * Added by https://github.com/yjl9903/AnimeGarden
 */
export function checkAndSetAnimeMonth(context: ParserContext, position: number) {
  const word = trim(context.tokens[position].content, ['★']);
  const RE = /^(\d{1,2})月新番$/;
  const match = RE.exec(word);
  if (!match) return false;
  context.tokens[position].category = TokenCategory.Identifier;
  setResult(context, ElementCategory.AnimeMonth, match[1]);
  return true;
}

/**
 * Added by https://github.com/yjl9903/AnimeGarden
 */
export function checkAndSetReleaseGroup(context: ParserContext, position: number) {
  const list = context.tokens[position].content.split(/&/);
  const ok = list.every(
    (f) => Fansubs.has(f) || f.endsWith('字幕组') || f.endsWith('字幕組') || f.endsWith('字幕社')
  );
  if (ok) {
    context.tokens[position].category = TokenCategory.Identifier;
    setResult(context, ElementCategory.ReleaseGroup, context.tokens[position].content);
    return true;
  }
  return false;
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

export function buildElement(
  context: ParserContext,
  category: ElementCategory,
  keepDelimiters: boolean,
  tokens: Token[]
) {
  const element = [];

  for (const token of tokens) {
    switch (token.category) {
      case TokenCategory.Unknown:
        element.push(token.content);
        token.category = TokenCategory.Identifier;
        break;
      case TokenCategory.Bracket:
        element.push(token.content);
        break;
      case TokenCategory.Delimiter:
        const delimiter = token.content[0] ?? '';
        if (keepDelimiters) {
          element.push(delimiter);
        } else {
          switch (delimiter) {
            case ',':
            case '&':
              element.push(delimiter);
              break;
            default:
              element.push(' ');
              break;
          }
        }
        break;
    }
  }

  if (!keepDelimiters) {
    const t = trim(element.join(''), ' -\u2010\u2011\u2012\u2013\u2014\u2015'.split(''));
    element.splice(0, element.length, t);
  }

  const title = element.join('');
  if (title) {
    setResult(context, category, title);
  }
}

/**
 * Returns whether or not a token at the current position is isolated (surrounded by braces).
 */
export function isTokenIsolated(context: ParserContext, position: number) {
  const prevToken = findPrevToken(context.tokens, position, TokenFlag.NotDelimiter);
  if (!isMatchTokenCategory(TokenCategory.Bracket, context.tokens[prevToken])) return false;
  const nextToken = findNextToken(context.tokens, position, TokenFlag.NotDelimiter);
  return isMatchTokenCategory(TokenCategory.Bracket, context.tokens[nextToken]);
}
