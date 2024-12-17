import type { ParseOptions, ParseResult } from './types';

import { Token } from './tokenizer';

export class Context {
  // Left consumed tags
  public left = 0;

  // Right consumed tags
  public right = 0;

  public tokens: Token[];

  public options: ParseOptions;

  public result: Partial<ParseResult> = {};

  public tags: string[] = [];

  public constructor(tokens: Token[], options: ParseOptions) {
    this.tokens = tokens;
    this.options = options;
  }

  public update<K1 extends keyof ParseResult>(key: K1, value: ParseResult[K1]) {
    this.result[key] = value;
  }

  public update2<
    K1 extends keyof Required<ParseResult>,
    K2 extends keyof Required<ParseResult>[K1]
  >(key1: K1, key2: K2, value: Required<ParseResult>[K1][K2]) {
    if (!this.result[key1]) {
      // @ts-expect-error
      this.result[key1] = {};
    }
    // @ts-expect-error
    this.result[key1][key2] = value;
  }

  public validate(): ParseResult | undefined {
    return this.result as ParseResult;
  }
}
