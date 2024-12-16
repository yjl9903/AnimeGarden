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

  public toString() {
    return `${this.left ?? ''}${this.text}${this.right ?? ''}`;
  }
}

export class Tokenizer {
  public static wrappers = new Map([
    ['[', ']'],
    ['【', '】'],
    ['(', ')'],
    ['（', '）'],
    ['{', '}']
  ]);

  private readonly text: string;

  private readonly tokens: Token[] = [];

  private cursor = 0;

  public constructor(text: string) {
    this.text = text;
  }

  public run() {
    let cur = '';
    let left: string | undefined = undefined;
    let right: string | undefined = undefined;
    while (this.cursor < this.text.length) {
      const char = this.text[this.cursor];
      if (Tokenizer.wrappers.has(char)) {
        if (cur) {
          this.tokens.push(new Token(cur.trim()));
          cur = '';
        }
        left = char;
        right = Tokenizer.wrappers.get(char)!;
      } else if (left && right && char === right) {
        this.tokens.push(new Token(cur.trim(), left, right));
        cur = '';
        left = undefined;
        right = undefined;
      } else {
        cur += char;
      }
      this.cursor += 1;
    }
    if (cur) {
      this.tokens.push(new Token(cur.trim()));
    }
    return this.tokens.filter((t) => t.text);
  }
}
