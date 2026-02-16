import type { AnimeGardenSource } from '../animegarden/schema.ts';

export interface SubjectSource {
  readonly animegarden?: AnimeGardenSource;

  readonly rewrite: ResourceRewriteRule[];

  readonly order: ResourcesOrder;
}

export interface ResourcesOrder {
  readonly fansubs?: string[];

  readonly keywords?: KeywordsOrder;
}

export type KeywordsOrder = Array<{ name: string; keywords: string[] }>;

export type MatchContain<T> = { contain: T[] };

export type MatchRange = { range: [number, number] };

// Match resources with condition
export type ResourceRewriteMatch = {
  url?: MatchContain<string>;

  fansub?: MatchContain<string>;

  season?: MatchContain<number | null>;

  episode?: MatchContain<number | null> | MatchRange;
};

// Apply diff to resources
export type ResourceRewriteApply = {
  season?: number;

  episode?: number;

  episodeOffset?: number;
};

// Resolved resource rewrite rule
export type ResourceRewriteRule = {
  match: ResourceRewriteMatch;
  apply: ResourceRewriteApply;
};
