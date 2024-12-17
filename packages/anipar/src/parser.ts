import type { ParseOptions, ParseResult } from './types';

import { Context } from './context';
import { tokenize } from './tokenizer';
import { parseLeftTags, parseRightTags } from './keyword';
import { parseWrappedEpisodes } from './episodes';
import { parseFansub, parseTitle } from './title';

export function parse(title: string, options: ParseOptions = {}): ParseResult | undefined {
  const tokens = tokenize(title);
  if (tokens.length === 0) return undefined;

  const context = new Context(tokens, options);

  // 1. Parse right tags
  parseRightTags(context);
  // 2. Parse left tags
  parseLeftTags(context);
  // 3. Parse wrapped episodes
  parseWrappedEpisodes(context);
  // 4. Parse fansub
  parseFansub(context);
  // 5. Parse title
  if (!parseTitle(context)) {
    return undefined;
  }

  // 6. Return result
  return context.validate();
}
