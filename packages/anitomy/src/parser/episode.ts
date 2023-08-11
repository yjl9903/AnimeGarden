import { KeywordManager } from '../keyword';
import { ElementCategory } from '../element';
import { Token, TokenCategory, TokenFlag, findNextToken, findPrevToken } from '../token';
import { inRange, isNumericString, trim } from '../utils';

import { matchVolumePatterns, setVolumeNumber } from './volume';
import { indexOfDigit, isDigit, isValidEpisodeNumber } from './number';
import { ParserContext, getResult, hasResult, setResult } from './context';

export function searchForEpisodePatterns(context: ParserContext, tokens: number[]) {
  for (const it of tokens) {
    const token = context.tokens[it];
    const numericFront = token.content.length > 0 && /0-9/.test(token.content[0]);
    if (!numericFront) {
      // e.g. "EP.1", "Vol.1"
      if (numberComesAfterPrefix(context, ElementCategory.EpisodePrefix, token)) {
        return true;
      }
      if (numberComesAfterPrefix(context, ElementCategory.VolumePrefix, token)) {
        return true;
      }
    } else {
      // e.g. "8 & 10", "01 of 24"
      if (numberComesBeforeAnotherNumber(context, it)) {
        return true;
      }
    }

    // Look for other patterns
    if (matchEpisodePatterns(context, token.content, token)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a number follows the specified token
 */
function numberComesAfterPrefix(context: ParserContext, category: ElementCategory, token: Token) {
  const numberBegin = indexOfDigit(token.content);
  const prefix = KeywordManager.normalize(token.content.slice(0, numberBegin));
  if (!KeywordManager.contains(category, prefix)) return false;
  const num = token.content.slice(numberBegin);

  switch (category) {
    case ElementCategory.EpisodePrefix:
      if (!matchEpisodePatterns(context, num, token)) {
        setEpisodeNumber(context, num, token, false);
      }
      return true;
    case ElementCategory.VolumePrefix:
      if (!matchVolumePatterns(context, num, token)) {
        setVolumeNumber(context, num, token, false);
      }
      return true;
  }
  return false;
}

/**
 * Checks whether the number precedes the word "of"
 */
function numberComesBeforeAnotherNumber(context: ParserContext, position: number) {
  const separatorToken = findPrevToken(context.tokens, position, TokenFlag.NotDelimiter);
  if (!inRange(context.tokens, separatorToken)) return false;

  const separators = [
    ['&', true],
    ['of', false]
  ] as const;

  for (const sep of separators) {
    if (context.tokens[separatorToken].content !== sep[0]) continue;

    const otherToken = findNextToken(context.tokens, separatorToken, TokenFlag.NotDelimiter);
    if (
      !inRange(context.tokens, otherToken) ||
      !isNumericString(context.tokens[otherToken].content)
    ) {
      continue;
    }
    setEpisodeNumber(context, context.tokens[position].content, context.tokens[position], false);

    if (sep[1]) {
      setEpisodeNumber(
        context,
        context.tokens[otherToken].content,
        context.tokens[otherToken],
        false
      );
    }

    context.tokens[separatorToken].category = TokenCategory.Identifier;
    context.tokens[otherToken].category = TokenCategory.Identifier;
    return true;
  }

  return false;
}

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

    // e.g. "07.5"
    if (matchFractionalEpisodePattern(context, word, token)) {
      return true;
    }
  }

  if (numericFront) {
    // e.g. "01-02", "03-05v2", "01-12fin"
    if (matchMultiEpisodePattern(context, word, token)) {
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

  // e.g. "ED1", "OP4a", "OVA2"
  if (!numericFront && matchTypeAndEpisodePattern(context, word, token)) {
    return true;
  }

  // e.g. "4a", "111C"
  if (numericFront && !numericBack && matchPartialEpisodePattern(context, word, token)) {
    return true;
  }

  // U+8A71 is used as counter for stories, episodes of TV series, etc.
  if (matchJapaneseCounterPattern(context, word, token)) {
    return true;
  }

  return false;
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
  const RE = /^(\d{1,3})(?:[vV](\d))?[-~&+](\d{1,3})(?:[vV](\d)|[Ff][Ii][Nn]|[Ee][Nn][Dd])?$/;
  const match = RE.exec(word);

  if (!match) return false;
  const lowerBound = match[1];
  const upperBound = match[3];

  // Avoid matching expressions such as "009-1" or "5-2"
  if (+lowerBound <= +upperBound) {
    if (setEpisodeNumber(context, lowerBound, token, true)) {
      setEpisodeNumber(context, upperBound, token, true);

      if (match[2]) {
        setResult(context, ElementCategory.ReleaseVersion, match[2]);
      }
      if (match[4]) {
        setResult(context, ElementCategory.ReleaseVersion, match[4]);
      }
      return true;
    }
  }

  return false;
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

/**
 * Match type and episode. e.g. "ED1", "OP4a", "OVA2".
 */
function matchTypeAndEpisodePattern(context: ParserContext, word: string, token: Token) {
  const numberBegin = indexOfDigit(word);
  const prefix = word.slice(0, numberBegin);

  const entry = KeywordManager.find(KeywordManager.normalize(prefix), ElementCategory.AnimeType);
  if (entry) {
    setResult(context, entry.category, prefix);

    const num = word.slice(numberBegin);
    if (matchEpisodePatterns(context, num, token) || setEpisodeNumber(context, num, token, true)) {
      const foundIdx = context.tokens.indexOf(token);
      if (foundIdx !== -1) {
        // Split token (we do this last in order to avoid invalidating our token reference earlier)
        token.content = num;
        context.tokens.splice(foundIdx, 0, {
          category: entry.identifiable ? TokenCategory.Identifier : TokenCategory.Unknown,
          content: prefix,
          enclosed: token.enclosed
        });
      }
      return true;
    }
  }

  return false;
}

/**
 * Match partial episodes. e.g. "4a", "111C", "13fin".
 */
function matchPartialEpisodePattern(context: ParserContext, word: string, token: Token) {
  if (!word) return false;
  let foundIdx = word.length;
  for (let i = 0; i < word.length; i++) {
    if (!isDigit(word[i])) {
      foundIdx = i;
      break;
    }
  }

  const suffix = word.slice(foundIdx);
  const valid = ['a', 'b', 'c', 'fin', 'end'];

  return valid.includes(suffix.toLocaleLowerCase()) && setEpisodeNumber(context, word, token, true);
}

/**
 * Match Japanese patterns. e.g. U+8A71 is used as counter for stories, episodes of TV series, etc.
 * e.g. 01話, 第02集
 */
function matchJapaneseCounterPattern(context: ParserContext, word: string, token: Token) {
  const hua = ['話', '话', '集'];
  if (word.length > 0 && hua.includes(word.at(-1)!)) {
    const RE = /^第?(\d{1,4})(?:[vV](\d))?(?:話|话|集)$/;
    const match = RE.exec(word);
    if (!match) return false;
    setEpisodeNumber(context, match[1], token, false);
    if (match[2]) {
      setResult(context, ElementCategory.ReleaseVersion, match[2]);
    }
    return true;
  }
  return false;
}

export function setEpisodeNumber(
  context: ParserContext,
  num: string,
  token: Token,
  validate: boolean
) {
  if (validate && !isValidEpisodeNumber(num)) return false;

  token.category = TokenCategory.Identifier;

  if (hasResult(context, ElementCategory.EpisodeNumber)) {
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
