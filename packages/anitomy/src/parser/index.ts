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
import {
  AnimeYearMax,
  AnimeYearMin,
  indexOfDigit,
  searchForEquivalentNumbers,
  searchForIsolatedEpisodeNumber,
  searchForLastNumber,
  searchForSeparatedNumbers
} from './number';
import { ParserContext, hasResult, setResult } from './context';
import {
  checkAndSetAnimeSeasonKeyword,
  checkAndSetAnimeSeason,
  checkExtentKeyword,
  isTokenIsolated
} from './parser';
import { searchForEpisodePatterns } from './episode';

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
      if (isElementCategorySingular(category) && hasResult(context, category)) {
        continue;
      }

      switch (found.category) {
        case ElementCategory.AnimeSeasonPrefix:
          checkAndSetAnimeSeasonKeyword(context, i);
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
      // Added by https://github.com/yjl9903/AnimeGarden
      // e.g. S2, S02
      if (checkAndSetAnimeSeason(context, i)) {
        continue;
      }
      // CRC32 checksum
      if (!hasResult(context, ElementCategory.FileChecksum) && isCRC32(word)) {
        category = ElementCategory.FileChecksum;
      } else if (!hasResult(context, ElementCategory.VideoResolution) && isResolution(word)) {
        category = ElementCategory.VideoResolution;
      }
      // Video extension may appear in the title
      {
        const found = KeywordManager.find(keyword, ElementCategory.FileExtension);
        if (found) {
          category = found.category;
        }
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

    // Anime Year
    const num = +token.content;
    if (AnimeYearMin <= num && num <= AnimeYearMax) {
      if (!hasResult(context, ElementCategory.AnimeYear)) {
        setResult(context, ElementCategory.AnimeYear, token.content);
        token.category = TokenCategory.Identifier;
        continue;
      }
    }

    // Video Resolution
    if (num !== 480 && num !== 720 && num !== 1080) continue;
    // If these numbers are isolated, it's more likely for them to be the
    // video resolution rather than the episode number. Some fansub groups use these without the "p" suffix.
    if (hasResult(context, ElementCategory.VideoResolution)) continue;
    setResult(context, ElementCategory.VideoResolution, token.content);
    token.category = TokenCategory.Identifier;
  }
}

function searchForEpisodeNumber(context: ParserContext) {
  const tokens = context.tokens
    .map((token, idx) => [token, idx] as const)
    .filter(([token]) => indexOfDigit(token.content) !== -1)
    .map(([_token, idx]) => idx);
  if (tokens.length === 0) return;

  context.isEpisodeKeywordsFound = hasResult(context, ElementCategory.EpisodeNumber);

  // If a token matches a known episode pattern, it has to be the episode number
  if (searchForEpisodePatterns(context, tokens)) return;

  // We have previously found an episode number via keywords
  context.isEpisodeKeywordsFound = hasResult(context, ElementCategory.EpisodeNumber);
  if (context.isEpisodeKeywordsFound) return;

  // From now on, we're only interested in numeric tokens
  tokens.splice(
    0,
    tokens.length,
    ...tokens.filter((t) => isNumericString(context.tokens[t].content))
  );

  // e.g. "01 (176)", "29 (04)"
  if (searchForEquivalentNumbers(context, tokens)) return;

  // e.g. " - 08"
  if (searchForSeparatedNumbers(context, tokens)) return;

  // "e.g. "[12]", "(2006)"
  if (searchForIsolatedEpisodeNumber(context, tokens)) return;

  // Consider using the last number as a last resort
  searchForLastNumber(context, tokens);
}

function searchForAnimeTitle(context: ParserContext) {}

function searchForReleaseGroup(context: ParserContext) {}

function searchForEpisodeTitle(context: ParserContext) {}

function validateElements(context: ParserContext) {}
