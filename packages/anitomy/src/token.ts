export type TokenCategory = 'Unknown' | 'Bracket' | 'Delimiter' | 'Identifier' | 'Invalid';

export interface Token {
  category: TokenCategory;

  content: string;

  enclosed: boolean;
}

export interface TextRange {
  text: string;

  offset: number;

  size: number;
}

export function rangeToStr(range: TextRange) {
  return range.text.slice(range.offset, range.offset + range.size);
}
