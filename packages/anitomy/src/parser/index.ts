import type { AnitomyOptions, ParsedResult } from '../types';

import { KeywordManager } from '../keyword';
import { ElementCategory } from '../element';
import { Token, TokenCategory } from '../token';
import { isNumericString, trim } from '../utils';

import {
  isCRC32,
  isElementCategorySearchable,
  isElementCategorySingular,
  isResolution
} from './utils';
import { indexOfDigit } from './number';
import { ParserContext, hasResult, setResult } from './context';
import { checkAnimeSeasonKeyword, checkExtentKeyword, isTokenIsolated } from './parser';

export function parse(result: ParsedResult, tokens: Token[], options: AnitomyOptions) {
  const context: ParserContext = {
    tokens,
    options,
    result,
    isEpisodeKeywordsFound: false
  };

  searchForKeywords(context);
  searchForIsolatedNumbers(context);

  if (options.parseEpisodeNumber) {
    searchForEpisodeNumber(context);
  }

  searchForAnimeTitle(context);

  if (options.parseReleaseGroup && !hasResult(context, ElementCategory.ReleaseGroup)) {
    searchForReleaseGroup(context);
  }

  if (options.parseEpisodeTitle && hasResult(context, ElementCategory.EpisodeNumber)) {
    searchForEpisodeTitle(context);
  }

  validateElements(context);

  return { ok: hasResult(context, ElementCategory.AnimeTitle), result: context.result };
}

function searchForKeywords(context: ParserContext) {
  const tokens = context.tokens;
  const options = context.options;

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
      if (isElementCategorySingular(category) && !hasResult(context, category)) {
        continue;
      }

      switch (found.category) {
        case ElementCategory.AnimeSeasonPrefix:
          checkAnimeSeasonKeyword(context, i);
          continue;
        case ElementCategory.EpisodePrefix:
          if (found.valid) {
            checkExtentKeyword(context, ElementCategory.EpisodeNumber, i);
          }
          continue;
        case ElementCategory.ReleaseVersion:
          word = word.slice(1);
          break;
        case ElementCategory.VolumePrefix:
          checkExtentKeyword(context, ElementCategory.VolumeNumber, i);
          continue;
      }
    } else {
      // CRC32 checksum
      if (!hasResult(context, ElementCategory.FileChecksum) && isCRC32(word)) {
        category = ElementCategory.FileChecksum;
      } else if (!hasResult(context, ElementCategory.VideoResolution) && isResolution(word)) {
        category = ElementCategory.VideoResolution;
      }
    }

    if (category !== ElementCategory.Unknown) {
      setResult(context, category, word);
      if (!found || found.identifiable) {
        token.category = TokenCategory.Identifier;
      }
    }
  }
}

function searchForIsolatedNumbers(context: ParserContext) {
  for (let i = 0; i < context.tokens.length; i++) {
    const token = context.tokens[i];
    if (
      token.category !== TokenCategory.Unknown ||
      !isNumericString(token.content) ||
      !isTokenIsolated(context, i)
    ) {
      continue;
    }

    const num = +token.content;
  }
}

function searchForEpisodeNumber(context: ParserContext) {}

function searchForAnimeTitle(context: ParserContext) {}

function searchForReleaseGroup(context: ParserContext) {}

function searchForEpisodeTitle(context: ParserContext) {}

function validateElements(context: ParserContext) {}
