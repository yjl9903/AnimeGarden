import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

describe('debug', () => {
  const title = `[雪飄工作室][アイカツプラネット！ミララボ/Aikatsu_Planet!-Mirror_Labo/偶像活動星球！镜中练功房][S2E01（总第13集）][繁](檢索:偶活/愛活)`;

  it(title, () => {
    expect(parse(title, { fansub: Fansub.雪飄工作室 })).toMatchInlineSnapshot(`
      {
        "episode": {
          "number": 1,
          "type": "总第13集",
        },
        "fansub": {
          "alias": "雪飄工作室",
          "name": "雪飄工作室(FLsnow)",
        },
        "search": [
          "偶活",
          "愛活",
        ],
        "season": {
          "number": 2,
        },
        "subtitle": {
          "languages": [
            "繁",
          ],
        },
        "title": "アイカツプラネット！ミララボ",
        "titles": [
          "Aikatsu_Planet!-Mirror_Labo",
          "偶像活動星球！镜中练功房",
        ],
      }
    `);
  });
});
