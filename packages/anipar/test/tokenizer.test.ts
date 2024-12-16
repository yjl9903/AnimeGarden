import { describe, it, expect } from 'vitest';

import { Tokenizer } from '../src/tokenizer';

describe('tokenizer', () => {
  it('should work', () => {
    const t = new Tokenizer(
      '[ANi] Seirei Gensouki / 精靈幻想記 2 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]'
    );
    expect(t.run()).toMatchInlineSnapshot(`
      [
        Token {
          "left": "[",
          "right": "]",
          "text": "ANi",
        },
        Token {
          "left": undefined,
          "right": undefined,
          "text": " Seirei Gensouki / 精靈幻想記 2 - 11 ",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "1080P",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "Baha",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "WEB-DL",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "AAC AVC",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "CHT",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "MP4",
        },
      ]
    `);
  });
});
