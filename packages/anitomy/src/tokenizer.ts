import type { AnitomyOptions, ParsedResult } from './types';

import { KeywordManager } from './keyword';
import { TextRange, Token, TokenCategory } from './token';

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
  const result: ParsedResult = {};
  const tokens: Token[] = [];

  tokenizeByBrackets();

  return { result, tokens };

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
    Object.assign(result, _result);

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
    }
  }
}

function findPrevToken(tokens: Token[], position: number) {}
