import type { ParseOptions, ParseResult } from './types';

import { tokenize, Token } from './tokenizer';

interface Context {
  cursor: number;

  tokens: Token[];

  result: Partial<ParseResult>;
}

export function parse(title: string, options: ParseOptions = {}): ParseResult | undefined {
  const tokens = tokenize(title);
  if (tokens.length === 0) return undefined;

  const context: Context = { cursor: 0, tokens, result: {} };
  const fansub = parseFansub(context);

  return undefined;
}

function parseFansub(ctx: Context) {
  const token = ctx.tokens[0];
  if (token.isWrapped) {
    // 1. Normal case
    const text = token.text;

    // 2. Collab
    const [name, ...collab] = text.split('&');

    // 3. Set result
    if (!ctx.result.fansub) {
      ctx.cursor = 1;
      ctx.result.fansub = {
        name
      };
      if (collab.length > 0) {
        ctx.result.fansub.collab = collab;
      }
    }

    return text;
  }
}
