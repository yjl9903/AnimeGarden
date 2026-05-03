import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

describe('debug', () => {
  const title = `[Pre-S&三明治摸鱼部&Y-Raws] 超时空辉夜姬 Cosmic Princess Kaguya [WebRip 1080P HEVC 10Bit EAC3&AAC MKV][简繁日内封]`;

  it(title, () => {
    expect(parse(title, { fansub: Fansub.Prejudice_Studio })).toMatchInlineSnapshot(`
      {
        "fansub": {
          "alias": "Pre-S",
          "collab": [
            "三明治摸鱼部",
            "Y-Raws",
          ],
          "name": "Prejudice-Studio",
        },
        "file": {
          "audio": {
            "term": "EAC3&AAC",
          },
          "extension": "MKV",
          "video": {
            "resolution": "1080P",
            "term": "10Bit",
          },
        },
        "source": "WebRip",
        "subtitle": {
          "format": "内封",
          "languages": [
            "简",
            "繁",
            "日",
          ],
        },
        "title": "超时空辉夜姬 Cosmic Princess Kaguya",
      }
    `);
  });
});
