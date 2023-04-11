export enum TokenCategory {
  Unknown = 'Unknown',
  Bracket = 'Bracket',
  Delimiter = 'Delimiter',
  Identifier = 'Identifier',
  Invalid = 'Invalid'
}

export interface Token {
  category: TokenCategory;

  content: string;

  enclosed: boolean;
}

export class TextRange {
  public text: string;

  public offset: number;

  public size: number;

  public constructor(text: string, offset: number, size: number) {
    this.text = text;
    this.offset = offset;
    this.size = size;
  }

  public fork(offset: number, size: number) {
    return new TextRange(this.text, offset, size);
  }

  public toString() {
    return this.text.slice(this.offset, this.offset + this.size);
  }
}
