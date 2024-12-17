import type { ParseOptions, ParseResult } from './types';

import { Context } from './context';
import { tokenize } from './tokenizer';
import { parseFansub, parseTitle } from './title';
import { parseLeftTags, parseRightTags } from './keyword';

export function parse(title: string, options: ParseOptions = {}): ParseResult | undefined {
  const tokens = tokenize(title);
  if (tokens.length === 0) return undefined;

  const context = new Context(tokens, options);

  // 1. Parse right tags
  parseRightTags(context);
  // 2. Parse left tags
  parseLeftTags(context);
  // 3. Parse fansub
  if (!parseFansub(context)) {
    return undefined;
  }
  // 4. Parse title
  if (!parseTitle(context)) {
    return undefined;
  }

  // 5. Return result
  return context.validate();
}
