export class Token {
  public readonly text: string;

  public readonly left: string | undefined;

  public readonly right: string | undefined;

  public constructor(text: string, left?: string, right?: string) {
    this.text = text;
    this.left = left;
    this.right = right;
  }

  public get isWrapped() {
    return this.left && this.right;
  }

  public slice(start: number, end?: number) {
    const text = this.text.slice(start, end);
    return new Token(text, this.left, this.right);
  }

  public trim() {
    const text = this.text.trim();
    return new Token(text, this.left, this.right);
  }

  public toString() {
    return `${this.left ?? ''}${this.text}${this.right ?? ''}`;
  }
}

export const Wrappers = new Map([
  ['[', ']'],
  ['【', '】'],
  ['(', ')'],
  ['（', '）'],
  ['{', '}']
]);

export const RevWrappers = new Map([...Wrappers.entries()].map(([k, v]) => [v, k]));

export function tokenize(text: string) {
  const tokens: Token[] = [];

  let cursor = 0;
  let cur = '';
  let left: string | undefined = undefined;
  let right: string | undefined = undefined;
  while (cursor < text.length) {
    const char = text[cursor];
    if (Wrappers.has(char)) {
      if (cur) {
        tokens.push(new Token(cur.trim()));
        cur = '';
      }
      left = char;
      right = Wrappers.get(char)!;
    } else if (left && right && char === right) {
      tokens.push(new Token(cur.trim(), left, right));
      cur = '';
      left = undefined;
      right = undefined;
    } else {
      cur += char;
    }
    cursor += 1;
  }
  if (cur) {
    tokens.push(new Token(cur.trim()));
  }

  return tokens.filter((t) => t.text);
}
