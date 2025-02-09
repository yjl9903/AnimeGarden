import type { ParseOptions, ParseResult } from './types';

import { Context } from './context';
import { tokenize } from './tokenizer';
import { parseLeftTags, parseRightTags } from './keyword';
import { parseFansub, parseTitle } from './title';

export function parse(title: string, options: ParseOptions = {}): ParseResult | undefined {
  const tokens = tokenize(title);
  if (tokens.length === 0) return undefined;

  const context = new Context(tokens, options);

  // 1. Parse right tags
  parseRightTags(context);
  // 2. Parse left tags
  parseLeftTags(context);
  // 3. Parse fansub
  parseFansub(context);
  parseLeftTags(context);
  // 4. Parse title
  if (!parseTitle(context)) {
    return undefined;
  }

  // 6. Return result
  const result = context.validate();
  return result ? postprocess(result) : undefined;
}

function postprocess(result: ParseResult) {
  if (result.fansub?.name === 'ANi') {
    if (result.title && result.titles && result.titles.length === 1) {
      const t1 = result.title;
      const t2 = result.titles[0];
      result.title = t2;
      result.titles = [t1];
    }
  }
  return result;
}
