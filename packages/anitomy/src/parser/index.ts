import type { AnitomyOptions, ParsedResult } from '../types';

import { isNumericString, mergeResult, trim } from '../utils';
import { Token, TokenCategory } from '../token';
import { KeywordManager } from '../keyword';
import { ElementCategory } from '../element';
import {
  isCRC32,
  isElementCategorySearchable,
  isElementCategorySingular,
  isResolution
} from './utils';
import { checkAnimeSeasonKeyword, checkExtentKeyword } from './parser';

export function parse(tokens: Token[], options: AnitomyOptions) {
  let result: ParsedResult = {};

  searchForKeywords();
  searchForIsolatedNumbers();

  if (options.parseEpisodeNumber) {
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
        if (!options.parseReleaseGroup && category === ElementCategory.ReleaseGroup) {
          continue;
        }
        if (!isElementCategorySearchable(category) || !found.searchable) {
          continue;
        }
        if (isElementCategorySingular(category)) {
          continue;
        }

        switch (found.category) {
          case ElementCategory.AnimeSeasonPrefix:
            result = mergeResult(result, checkAnimeSeasonKeyword(tokens, i));
            continue;
          case ElementCategory.EpisodePrefix:
            if (found.valid) {
              result = mergeResult(
                result,
                checkExtentKeyword(ElementCategory.EpisodeNumber, tokens, i)
              );
            }
            continue;
          case ElementCategory.ReleaseVersion:
            word = word.slice(1);
            break;
          case ElementCategory.VolumePrefix:
            continue;
        }
      } else {
        // CRC32 checksum
        if (!result[ElementCategory.FileChecksum] && isCRC32(word)) {
          category = ElementCategory.FileChecksum;
        } else if (!result[ElementCategory.VideoResolution] && isResolution(word)) {
          category = ElementCategory.VideoResolution;
        }
      }

      if (category !== ElementCategory.Unknown) {
        result = mergeResult(result, { [category]: word });
        if (!found || found.identifiable) {
          token.category = TokenCategory.Identifier;
        }
      }
    }
  }

  function searchForIsolatedNumbers() {}

  function searchForEpisodeNumber() {}

  function searchForAnimeTitle() {}
}
