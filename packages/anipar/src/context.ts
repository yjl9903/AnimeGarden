import type { ParseOptions, ParseResult } from './types';

import { Token } from './tokenizer';

export class Context {
  // Left cursor for consumed tokens
  public left = 0;

  // Right cursor for consumed tokens
  public right;

  public tokens: Token[];

  public options: ParseOptions;

  public result: Partial<ParseResult>;

  public tags: string[];

  public constructor(tokens: Token[], options: ParseOptions) {
    this.tokens = tokens;
    this.options = options;
    this.right = tokens.length - 1;
    this.tags = [];
    this.result = {};
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

  public update3<
    K1 extends keyof Required<ParseResult>,
    K2 extends keyof Required<ParseResult>[K1],
    K3 extends keyof Required<Required<ParseResult>[K1]>[K2]
  >(key1: K1, key2: K2, key3: K3, value: Required<Required<ParseResult>[K1]>[K2][K3]) {
    if (!this.result[key1]) {
      // @ts-expect-error
      this.result[key1] = {};
    }
    // @ts-expect-error
    if (!this.result[key1][key2]) {
      // @ts-expect-error
      this.result[key1][key2] = {};
    }
    // @ts-expect-error
    this.result[key1][key2][key3] = value;
  }

  public get hasEpisode() {
    return this.result.episode || this.result.episodes || this.result.episodeRange;
  }

  public validate(): ParseResult | undefined {
    this.result.tags = this.tags;
    return this.result as ParseResult;
  }
}
