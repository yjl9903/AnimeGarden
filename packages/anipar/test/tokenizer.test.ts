import { describe, it, expect } from 'vitest';

import { tokenize } from '../src/tokenizer';

describe('tokenizer', () => {
  it('should handle ANi', () => {
    expect(
      tokenize('[ANi] Seirei Gensouki / 精靈幻想記 2 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]')
    ).toMatchInlineSnapshot(`
      [
        Token {
          "left": "[",
          "right": "]",
          "text": "ANi",
        },
        Token {
          "left": undefined,
          "right": undefined,
          "text": "Seirei Gensouki / 精靈幻想記 2 - 11",
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

  it('should handle 喵萌奶茶屋', () => {
    expect(
      tokenize(
        '【喵萌奶茶屋】★劇場版★[歡迎來到駒田蒸餾所 / 駒田蒸留所へようこそ / Komada Jouryuujo e Youkoso][BDRip][1080p][繁日雙語][招募翻譯時軸]'
      )
    ).toMatchInlineSnapshot(`
      [
        Token {
          "left": "【",
          "right": "】",
          "text": "喵萌奶茶屋",
        },
        Token {
          "left": undefined,
          "right": undefined,
          "text": "★劇場版★",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "歡迎來到駒田蒸餾所 / 駒田蒸留所へようこそ / Komada Jouryuujo e Youkoso",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "BDRip",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "1080p",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "繁日雙語",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "招募翻譯時軸",
        },
      ]
    `);
  });

  it('should handle 千夏字幕组', () => {
    expect(
      tokenize(
        '[千夏字幕組][大室家 dear friends_Ohmuro-ke - dear friends][劇場版][BDRip_1080p_AVC][繁體]'
      )
    ).toMatchInlineSnapshot(`
      [
        Token {
          "left": "[",
          "right": "]",
          "text": "千夏字幕組",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "大室家 dear friends_Ohmuro-ke - dear friends",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "劇場版",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "BDRip_1080p_AVC",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "繁體",
        },
      ]
    `);
  });

  it('should handle inner wrapper', () => {
    expect(
      tokenize(
        '[Skymoon-Raws] 最狂輔助職業【話術士】世界最強戰團聽我號令 / Saikyou no Shien-shoku [Wajutsushi] - 12 [ViuTV][WEB-DL][1080p][AVC AAC]'
      )
    ).toMatchInlineSnapshot(`
      [
        Token {
          "left": "[",
          "right": "]",
          "text": "Skymoon-Raws",
        },
        Token {
          "left": undefined,
          "right": undefined,
          "text": "最狂輔助職業",
        },
        Token {
          "left": "【",
          "right": "】",
          "text": "話術士",
        },
        Token {
          "left": undefined,
          "right": undefined,
          "text": "世界最強戰團聽我號令 / Saikyou no Shien-shoku",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "Wajutsushi",
        },
        Token {
          "left": undefined,
          "right": undefined,
          "text": "- 12",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "ViuTV",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "WEB-DL",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "1080p",
        },
        Token {
          "left": "[",
          "right": "]",
          "text": "AVC AAC",
        },
      ]
    `);
  });
});
