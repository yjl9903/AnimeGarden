import type { AnitomyOptions, ParsedResult } from './types';

import { tokenize } from './tokenizer';
import { mergeResult } from './utils';
import { KeywordManager } from './keyword';

export type * from './types';

export function parse(filename: string, _options: Partial<AnitomyOptions> = {}): ParsedResult {
  if (filename === '') return {};

  let result: ParsedResult = {};

  const options = resolveOptions(_options);

  result.filename = filename;
  if (options.extension) {
    const ext = removeExtension(filename);
    if (ext) {
      result.filename = filename;
      result.extension = ext.extension;
    }
  }

  const tokenized = tokenize(result.filename!, options);
  result = mergeResult(result, tokenized.result);
  if (!tokenized.ok) {
    return result;
  }

  return result;
}

export function resolveOptions(options: Partial<AnitomyOptions>): AnitomyOptions {
  return {
    delimiters: ' _.&+,|',
    episode: true,
    extension: true,
    ...options
  };
}

function removeExtension(filename: string) {
  const position = filename.lastIndexOf('.');
  if (position === -1) return undefined;

  const extension = filename.slice(position + 1);
  if (extension.length > 4 || !/^[a-zA-Z0-0]+$/.test(extension)) {
    return undefined;
  }

  if (!KeywordManager.contains('extension', extension)) {
    return undefined;
  }

  return {
    filename: filename.slice(0, position),
    extension
  };
}
