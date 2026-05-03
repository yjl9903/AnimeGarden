import type { ParseOptions, ParseResult } from './types.js';

import { Token } from './tokenizer/index.js';

// MARK: 上下文
export class Context {
  // Left cursor for consumed tokens (inclusive)
  public left = 0;

  // Right cursor for consumed tokens (inclusive)
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
    if (options.fansub) {
      this.result.fansub = { name: options.fansub };
    }
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
    return this.result.episode || this.result.episodes || this.result.episodesRange;
  }

  public validate(): ParseResult | undefined {
    if (this.tags.length > 0) {
      this.result.tags = [...new Set([...(this.result.tags ?? []), ...this.tags])];
    }

    if (this.result.subtitle?.languages) {
      const languages = this.result.subtitle?.languages;
      this.result.subtitle.languages = normalizeLanguages(languages);
    }

    if (this.result.variants) {
      this.result.variants = [...new Set(this.result.variants)];
    }

    if (this.result.title && this.result.title.length > 0) {
      return this.result as ParseResult;
    }

    return undefined;
  }
}

// MARK: 字幕语言归一化

const NormalizedLanguages = ['简', '繁', '粤', '日', '英'] as const;

function normalizeLanguage(language: string): string[] | undefined {
  const trimmed = language.trim();
  const upper = trimmed.toUpperCase();

  if (/^(CN|CHINESE|ZH|中|中文|中字|国语中字|國語中字)$/.test(upper)) {
    return undefined;
  }

  const languages: string[] = [];
  const matches = {
    简: /(^|[^A-Z])CHS($|[^A-Z])|ZH[-_]?HANS|简|簡|简体|簡體|简中|簡中/i.test(trimmed),
    繁: /(^|[^A-Z])CHT($|[^A-Z])|ZH[-_]?HANT|繁|繁体|繁體|繁中|BIG5/i.test(trimmed),
    粤: /(^|[^A-Z])YUE($|[^A-Z])|粤|粵|广东话|廣東話|CANTONESE/i.test(trimmed),
    日: /(^|[^A-Z])(JP|JPN|JA)($|[^A-Z])|日|日本|JAPANESE/i.test(trimmed),
    英: /(^|[^A-Z])(EN|ENG)($|[^A-Z])|英|ENGLISH/i.test(trimmed)
  };

  if (/[中华華]/.test(trimmed) && !matches.简 && !matches.繁 && !matches.粤) {
    return undefined;
  }

  for (const language of NormalizedLanguages) {
    if (matches[language]) {
      languages.push(language);
    }
  }

  return languages.length > 0 ? languages : undefined;
}

function normalizeLanguages(languages: string[]): string[] {
  const normalized = new Set<string>();
  const unknown: string[] = [];

  for (const language of languages) {
    const parts = normalizeLanguage(language);
    if (parts) {
      parts.forEach((part) => normalized.add(part));
    } else if (!unknown.includes(language)) {
      unknown.push(language);
    }
  }

  return [...NormalizedLanguages.filter((language) => normalized.has(language)), ...unknown];
}
