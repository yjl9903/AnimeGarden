import type { AnitomyOptions, ParsedResult } from './types';

import { KeywordManager } from './keyword';
import { isNumericString, mergeResult } from './utils';
import { TextRange, Token, TokenCategory, TokenFlag, findNextToken, findPrevToken } from './token';

const Brackets: Array<[string, string]> = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['「', '」'],
  ['『', '』'],
  ['【', '】'],
  ['（', '）']
];

export function tokenize(filename: string, options: AnitomyOptions) {
  let result: ParsedResult = {};
  const tokens: Token[] = [];

  tokenizeByBrackets();

  return { ok: tokens.length > 0, result, tokens };

  function addToken(category: TokenCategory, enclosed: boolean, range: TextRange) {
    tokens.push({
      category,
      content: range.toString(),
      enclosed
    });
  }

  function tokenizeByBrackets() {
    let isBracketOpen = false;
    let matchingBracket: string | undefined = undefined;

    for (let i = 0; i < filename.length; ) {
      const foundIdx =
        !isBracketOpen || !matchingBracket
          ? findFirstBracket(i, filename.length)
          : filename.indexOf(matchingBracket, i);

      const range = new TextRange(filename, i, foundIdx === -1 ? filename.length : foundIdx - i);
      if (range.size > 0) {
        // Check if our range contains any known anime identifiers
        tokenizeByPreidentified(isBracketOpen, range);
      }

      if (foundIdx !== -1) {
        addToken(TokenCategory.Bracket, true, range.fork(range.offset + range.size, 1));
        isBracketOpen = !isBracketOpen;
        i = foundIdx + 1;
      } else {
        break;
      }
    }

    function findFirstBracket(start: number, end: number) {
      for (let i = start; i < end; i++) {
        for (const [left, right] of Brackets) {
          if (filename[i] === left) {
            matchingBracket = right;
            return i;
          }
        }
      }
      return -1;
    }
  }

  function tokenizeByPreidentified(enclosed: boolean, range: TextRange) {
    const { result: _result, predefined } = KeywordManager.peek(range);
    result = mergeResult(result, _result);

    let offset = range.offset;
    let subRange = range.fork(range.offset, 0);
    while (offset < range.offset + range.size) {
      for (const predefToken of predefined) {
        if (offset !== predefToken.offset) continue;
        if (subRange.size > 0) {
          tokenizeByDelimiters(enclosed, subRange);
        }

        addToken(TokenCategory.Identifier, enclosed, predefToken);
        subRange.offset = predefToken.offset + predefToken.size;
        offset = subRange.offset - 1;
      }

      subRange.size = ++offset - subRange.offset;
    }

    if (subRange.size > 0) {
      tokenizeByDelimiters(enclosed, subRange);
    }
  }

  function tokenizeByDelimiters(enclosed: boolean, range: TextRange) {
    const delimiters = getDelimiters(range);
    if (delimiters.size === 0) {
      addToken(TokenCategory.Unknown, enclosed, range);
      return;
    }
    for (let i = range.offset, end = range.offset + range.size; i < end; ) {
      let found = end;
      for (let j = i; j < end && j < range.text.length; j++) {
        if (delimiters.has(range.text[j])) {
          found = j;
          break;
        }
      }

      const subRange = range.fork(i, found - i);
      if (subRange.size > 0) {
        addToken(TokenCategory.Unknown, enclosed, subRange);
      }

      if (found !== end) {
        addToken(
          TokenCategory.Delimiter,
          enclosed,
          subRange.fork(subRange.offset + subRange.size, 1)
        );
        i = found + 1;
      } else {
        break;
      }
    }

    validateDelimiterTokens();
  }

  function getDelimiters(range: TextRange) {
    const delimiters = new Set<string>();
    for (let i = range.offset; i < range.offset + range.size; i++) {
      if (options.delimiters.includes(range.text[i])) {
        delimiters.add(range.text[i]);
      }
    }
    return delimiters;
  }

  function validateDelimiterTokens() {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.category !== TokenCategory.Delimiter) continue;
      const delimiter = token.content[0];

      const prevToken = findPrevToken(tokens, i, TokenFlag.Valid);
      let nextToken = findNextToken(tokens, i, TokenFlag.Valid);

      // Check for single-character tokens to prevent splitting group names, keywords, episode numbers, etc.
      if (![' ', '_'].includes(delimiter)) {
        // Single character token
        if (isSingleCharacterToken(prevToken)) {
          appendTokenTo(token, tokens[prevToken]);

          while (isUnknownToken(nextToken)) {
            appendTokenTo(tokens[nextToken], tokens[prevToken]);
            nextToken = findNextToken(tokens, i, TokenFlag.Valid);
            if (!isDelimiterToken(nextToken) || tokens[nextToken].content[0] !== delimiter)
              continue;
            appendTokenTo(tokens[nextToken], tokens[prevToken]);
            nextToken = findNextToken(tokens, nextToken, TokenFlag.Valid);
          }

          continue;
        }

        if (isSingleCharacterToken(nextToken)) {
          appendTokenTo(token, tokens[prevToken]);
          appendTokenTo(tokens[nextToken], tokens[prevToken]);
          continue;
        }
      }

      // Check for adjacent delimiters
      if (isUnknownToken(prevToken) && isDelimiterToken(nextToken)) {
        const nextDelimiter = tokens[nextToken].content[0];
        if (delimiter !== nextDelimiter && delimiter !== ',') {
          if (delimiter === ' ' || nextDelimiter === '_') {
            appendTokenTo(token, tokens[prevToken]);
          }
        }
      } else if (isDelimiterToken(prevToken) && isDelimiterToken(nextToken)) {
        const prevDelimiter = tokens[prevToken].content[0];
        const nextDelimiter = tokens[nextToken].content[0];
        if (prevDelimiter === nextDelimiter && prevDelimiter != delimiter) {
          token.category = TokenCategory.Unknown; // e.g. "& in "_&_"
        }
      }

      // Check for other special cases
      if (!['&', '+'].includes(delimiter)) continue;
      if (!isUnknownToken(prevToken) || !isUnknownToken(nextToken)) continue;
      if (
        !isNumericString(tokens[prevToken].content) ||
        !isNumericString(tokens[nextToken].content)
      ) {
        continue;
      }
      appendTokenTo(token, tokens[prevToken]);
      appendTokenTo(tokens[nextToken], tokens[prevToken]); // e.g. 01+02
    }

    // Remove invalid tokens
    tokens.splice(0, tokens.length, ...tokens.filter((t) => t.category !== TokenCategory.Invalid));

    function inRange<T>(list: T[], idx: number) {
      return 0 <= idx && idx < list.length;
    }

    function isDelimiterToken(idx: number) {
      return inRange(tokens, idx) && tokens[idx].category === TokenCategory.Delimiter;
    }

    function isUnknownToken(idx: number) {
      return inRange(tokens, idx) && tokens[idx].category === TokenCategory.Unknown;
    }

    function isSingleCharacterToken(idx: number) {
      const content = tokens[idx].content;
      return isUnknownToken(idx) && content.length === 1 && content !== '-';
    }

    function appendTokenTo(src: Token, dst: Token) {
      dst.content += src.content;
      src.category = TokenCategory.Invalid;
    }
  }
}
