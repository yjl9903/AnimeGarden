import type { AnitomyOptions, ParsedResult } from './types';

import { isNumericString, trim } from './utils';
import { Token, TokenCategory } from './token';
import { KeywordManager } from './keyword';
import { ElementCategory } from './element';

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

      let word = trim(token.content, [' ', '-']);
      if (word === '') continue;

      // Don't bother if the word is a number that cannot be CRC
      if (word.length !== 8 && isNumericString(word)) continue;

      let category = ElementCategory.Unknown;
      const keyword = KeywordManager.normalize(word);
      const found = KeywordManager.find(keyword, ElementCategory.Unknown);
      if (found) {
        category = found.category;
        switch (found.category) {
          case ElementCategory.AnimeSeasonPrefix:
            continue;
          case ElementCategory.EpisodePrefix:
            continue;
          case ElementCategory.ReleaseVersion:
            word = word.slice(1);
            break;
          case ElementCategory.VolumePrefix:
            continue;
        }
      } else {
      }

      if (category === ElementCategory.Unknown) continue;
      result[category] = word;
      if (!found || found.identifiable) {
        token.category = TokenCategory.Identifier;
      }
    }
  }

  function searchForIsolatedNumbers() {}

  function searchForEpisodeNumber() {}

  function searchForAnimeTitle() {}
}
