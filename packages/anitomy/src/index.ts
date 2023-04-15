import type { AnitomyOptions, AnitomyResult, ParsedResult } from './types';

import { mergeResult } from './utils';
import { KeywordManager } from './keyword';
import { ElementCategory } from './element';
import { parse as doParse } from './parser';
import { tokenize as doTokenize } from './tokenizer';

export type * from './types';

export function parse(
  filename: string,
  _options: Partial<AnitomyOptions> = {}
): AnitomyResult | undefined {
  if (filename === '') return undefined;

  let result: ParsedResult = {};

  const options = resolveOptions(_options);

  result.filename = filename;
  if (options.parseFileExtension) {
    const ext = removeExtension(filename);
    if (ext) {
      result.filename = filename;
      result.extension = ext.extension;
    }
  }

  const tokenized = doTokenize(result.filename!, options);
  result = mergeResult(result, tokenized.result);
  if (!tokenized.ok) {
    return resolveResult(result);
  }

  const parsed = doParse(result, tokenized.tokens, options);
  result = parsed.result;

  return resolveResult(result);
}

export function resolveOptions(options: Partial<AnitomyOptions>): AnitomyOptions {
  return {
    delimiters: ' _.&+,|',
    parseEpisodeNumber: true,
    parseEpisodeTitle: true,
    parseFileExtension: true,
    parseReleaseGroup: true,
    ...options
  };
}

function resolveResult(result: ParsedResult): AnitomyResult {
  const resolved: AnitomyResult = {
    title: result['title'],
    type: result['type'],
    season: normalizeSeason(result['season']),
    year: normalizeNumber(result['year']),
    month: normalizeNumber(result['month']),
    language: result['language'],
    subtitles: result['subtitles'],
    source: result['source'],
    episode: {
      number: normalizeNumber(result['episode.number']),
      numberAlt: normalizeNumber(result['episode.numberAlt']),
      title: result['episode.title']
    },
    volume: {
      number: normalizeNumber(result['volume'])
    },
    video: {
      term: result['video.term'],
      resolution: result['video.resolution']
    },
    audio: {
      term: result['audio.term']
    },
    release: {
      version: normalizeNumber(result['release.version']),
      group: result['release.group']
    },
    file: {
      name: result['filename']!,
      extension: result['extension'],
      checksum: result['checksum']
    }
  };
  return resolved;

  function normalizeSeason(num: string | undefined) {
    if (num !== undefined && num !== null) {
      return /^\d+$/.test(num) ? String(+num) : num;
    } else {
      return undefined;
    }
  }

  function normalizeNumber(num: string | undefined) {
    try {
      if (num !== undefined && num !== null) {
        const n = parseFloat(num);
        return !Number.isNaN(n) ? n : undefined;
      }
    } catch {}
    return undefined;
  }
}

function removeExtension(filename: string) {
  const position = filename.lastIndexOf('.');
  if (position === -1) return undefined;

  const extension = filename.slice(position + 1);
  if (extension.length > 4 || !/^[a-zA-Z0-0]+$/.test(extension)) {
    return undefined;
  }

  if (!KeywordManager.contains(ElementCategory.FileExtension, extension)) {
    return undefined;
  }

  return {
    filename: filename.slice(0, position),
    extension
  };
}
