import type { AnitomyOptions, ParsedResult } from './types';

import { isNumericString, trim } from './utils';
import { Token, TokenCategory } from './token';
import { KeywordManager } from './keyword';

export function parse(tokens: Token[], options: AnitomyOptions) {
  const result: ParsedResult = {};

  searchForKeywords();
  searchForIsolatedNumbers();

  if (options.episode) {
    searchForEpisodeNumber();
  }

  searchForAnimeTitle();

  return { result };

  function searchForKeywords() {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.category !== TokenCategory.Unknown) continue;

      const word = trim(token.content, [' ', '-']);
      if (word === '') continue;

      // Don't bother if the word is a number that cannot be CRC
      if (word.length !== 8 && isNumericString(word)) continue;

      const keyword = KeywordManager.normalize(word);
      
    }
  }

  function searchForIsolatedNumbers() {}

  function searchForEpisodeNumber() {}

  function searchForAnimeTitle() {}
}
