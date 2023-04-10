import type { ElementCategory } from './element';

export interface AnitomyOptions {
  delimiters: string;

  episode: boolean;

  extension: boolean;
}

export type ParsedResult = Partial<Record<ElementCategory, string>>;
