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

export enum TokenCategory {
  Unknown = 'Unknown',
  Bracket = 'Bracket',
  Delimiter = 'Delimiter',
  Identifier = 'Identifier',
  Invalid = 'Invalid'
}

export enum TokenFlag {
  // None
  None,
  // Categories
  Bracket,
  NotBracket,
  Delimiter,
  NotDelimiter,
  Identifier,
  NotIdentifier,
  Unknown,
  NotUnknown,
  Valid,
  NotValid,
  // Enclosed (Meaning that it is enclosed in some bracket (e.g. [ ] ))
  Enclosed,
  NotEnclosed
}

export interface Token {
  category: TokenCategory;

  content: string;

  enclosed: boolean;
}

function checkTokenFlags(token: Token, flags: TokenFlag[]) {
  // Make sure token is the correct closure
  if (flags.some((f) => f === TokenFlag.Enclosed || f === TokenFlag.NotEnclosed)) {
    const success = flags.includes(TokenFlag.Enclosed) === token.enclosed;
    if (!success) return false; // Not enclosed correctly (e.g. enclosed when we're looking for non-enclosed).
  }

  // Make sure token is the correct category
  if (!flags.some((f) => TokenFlag.Bracket <= f && f <= TokenFlag.NotValid)) {
    return true;
  }

  const tasks: [TokenFlag, TokenFlag, TokenCategory][] = [
    [TokenFlag.Bracket, TokenFlag.NotBracket, TokenCategory.Bracket],
    [TokenFlag.Delimiter, TokenFlag.NotDelimiter, TokenCategory.Delimiter],
    [TokenFlag.Identifier, TokenFlag.NotIdentifier, TokenCategory.Identifier],
    [TokenFlag.Unknown, TokenFlag.NotUnknown, TokenCategory.Unknown],
    [TokenFlag.NotValid, TokenFlag.Valid, TokenCategory.Invalid]
  ];
  for (const [fe, fn, c] of tasks) {
    const success = flags.includes(fe)
      ? token.category === c
      : flags.includes(fn) && token.category !== c;
    if (success) return true;
  }
  return false;
}

export function findNextToken(tokens: Token[], position: number, ...flags: TokenFlag[]) {
  for (let i = position + 1; i < tokens.length; i++) {
    if (checkTokenFlags(tokens[i], flags)) {
      return i;
    }
  }
  return tokens.length;
}

export function findPrevToken(tokens: Token[], position: number, ...flags: TokenFlag[]) {
  for (let i = position - 1; i >= 0; i--) {
    if (checkTokenFlags(tokens[i], flags)) {
      return i;
    }
  }
  return -1;
}
