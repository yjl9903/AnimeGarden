import { ElementCategory } from '../element';
import { Token, TokenCategory } from '../token';
import { isNumericString, trim } from '../utils';

import { ParserContext, getResult, hasResult, setResult } from './context';
import { isDigit, isValidEpisodeNumber } from './number';

export function matchEpisodePatterns(context: ParserContext, word: string, token: Token) {
  if (isNumericString(word)) return false;

  word = trim(word, [' ', '-']);

  const numericFront = isDigit(word[0]);
  const numericBack = isDigit(word[word.length - 1]);

  if (numericFront && numericBack) {
    // e.g. "01v2"
    if (matchSingleEpisodePattern(context, word, token)) {
      return true;
    }

    // e.g. "01-02", "03-05v2"
    if (matchMultiEpisodePattern(context, word, token)) {
      return true;
    }

    // e.g. "07.5"
    if (matchFractionalEpisodePattern(context, word, token)) {
      return true;
    }
  }

  if (numericBack) {
    //  e.g. "2x01", "S01E03", "S01-02xE001-150"
    if (matchSeasonAndEpisodePattern(context, word, token)) {
      return true;
    }

    // e.g. "#01", "#02-03v2"
    if (matchNumberSignPattern(context, word, token)) {
      return true;
    }
  }

  if (!numericFront) {
    // TODO
  }

  if (numericFront) {
    // TODO
  }

  return true;
}

/**
 * Match a single episode pattern. e.g. "01v2".
 */
function matchSingleEpisodePattern(context: ParserContext, word: string, token: Token) {
  const RE = /^(\d{1,3})[vV](\d)$/;
  const match = RE.exec(word);

  if (match) {
    setEpisodeNumber(context, match[1], token, false);
    setResult(context, ElementCategory.ReleaseVersion, match[2]);
    return true;
  } else {
    return false;
  }
}

/**
 * Match a multi episode pattern. e.g. "01-02", "03-05v2".
 */
function matchMultiEpisodePattern(context: ParserContext, word: string, token: Token) {
  const RE = /^(\d{1,3})(?:[vV](\d))?[-~&+](\d{1,3})(?:[vV](\d))?$/;
  const match = RE.exec(word);

  if (!match) return false;
  const lowerBound = match[1];
  const upperBound = match[3];

  // Avoid matching expressions such as "009-1" or "5-2"
  if (+lowerBound >= +upperBound) return false;
  if (!setEpisodeNumber(context, lowerBound, token, true)) {
    return false;
  }
  setEpisodeNumber(context, upperBound, token, true);

  if (match[2]) {
    setResult(context, ElementCategory.ReleaseVersion, match[2]);
  }
  if (match[4]) {
    setResult(context, ElementCategory.ReleaseVersion, match[4]);
  }

  return true;
}

/**
 * Match fractional episodes. e.g. "07.5"
 */
function matchFractionalEpisodePattern(context: ParserContext, word: string, token: Token) {
  const RE = /^\d+\.5$/;
  const match = RE.exec(word);
  return match && setEpisodeNumber(context, word, token, true);
}

/**
 * Match season and episode patterns. e.g. "2x01", "S01E03", "S01-02xE001-150".
 */
function matchSeasonAndEpisodePattern(context: ParserContext, word: string, token: Token) {
  const RE = /^S?(\d{1,2})(?:-S?(\d{1,2}))?(?:x|[ ._-x]?E)(\d{1,3})(?:-E?(\d{1,3}))?$/;
  const match = RE.exec(word);
  if (!match) return false;

  setResult(context, ElementCategory.AnimeSeason, match[1]);
  if (match[2]) {
    setResult(context, ElementCategory.AnimeSeason, match[2]);
  }
  setEpisodeNumber(context, match[3], token, false);
  if (match[4]) {
    setEpisodeNumber(context, match[4], token, false);
  }

  return true;
}

/**
 * Match episodes with number signs. e.g. "#01", "#02-03v2"
 */
function matchNumberSignPattern(context: ParserContext, word: string, token: Token) {
  if (word[0] !== '#') word = '';
  const RE = /^#(\d{1,3})(?:[-~&+](\d{1,3}))?(?:[vV](\d))?$/;
  const match = RE.exec(word);
  if (!match) return false;

  if (!setEpisodeNumber(context, match[1], token, true)) return false;
  if (match[2]) {
    setEpisodeNumber(context, match[2], token, false);
  }
  if (match[3]) {
    setResult(context, ElementCategory.ReleaseVersion, match[3]);
  }

  return true;
}

export function setEpisodeNumber(
  context: ParserContext,
  num: string,
  token: Token,
  validate: boolean
) {
  if (validate && !isValidEpisodeNumber(num)) return false;

  token.category = TokenCategory.Identifier;

  if (context.isEpisodeKeywordsFound && hasResult(context, ElementCategory.EpisodeNumber)) {
    const oldEp = getResult(context, ElementCategory.EpisodeNumber)!;
    const diff = +num - +oldEp;
    if (diff > 0) {
      setResult(context, ElementCategory.EpisodeNumberAlt, num);
      return true;
    } else if (diff < 0) {
      // Move old episode number to alt number
      // Then, reset the episode number
      setResult(context, ElementCategory.EpisodeNumber, num);
      setResult(context, ElementCategory.EpisodeNumberAlt, oldEp);
      return true;
    } else {
      // No need to add the same number twice
      return false;
    }
  } else {
    setResult(context, ElementCategory.EpisodeNumber, num);
    return true;
  }
}
