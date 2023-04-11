import type { AnitomyOptions, ParsedResult } from './types';

import { TextRange, Token, TokenCategory, rangeToStr } from './token';
import { KeywordManager } from './keyword';

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
      content: rangeToStr(range),
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

      const range: TextRange = {
        text: filename,
        offset: i,
        size: foundIdx === -1 ? filename.length : foundIdx - i
      };
      if (range.size > 0) {
        // Check if our range contains any known anime identifiers
        tokenizeByPreidentified(isBracketOpen, range);
      }

      if (foundIdx !== -1) {
        addToken('Bracket', true, { text: filename, offset: range.offset + range.size, size: 1 });
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
    let subRange: TextRange = { text: range.text, offset: range.offset, size: 0 };
    while (offset < range.offset + range.size) {
      for (const predefToken of predefined) {
        if (offset !== predefToken.offset) continue;
        if (subRange.size > 0) {
          tokenizeByDelimiters(enclosed, subRange);
        }

        addToken('Identifier', enclosed, predefToken);
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
      addToken('Unknown', enclosed, range);
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

      const subRange: TextRange = { text: range.text, offset: i, size: found - i };
      if (subRange.size > 0) {
        addToken('Unknown', enclosed, subRange);
      }

      if (found !== end) {
        addToken('Delimiter', enclosed, {
          text: range.text,
          offset: subRange.offset + subRange.size,
          size: 1
        });
        i = found + 1;
      } else {
        break;
      }
    }

    // TODO: validate
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
}
