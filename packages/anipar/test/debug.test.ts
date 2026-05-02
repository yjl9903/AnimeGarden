import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

describe('debug', () => {
  const title = `[黒ネズミたち] 海贼王 / One Piece - 536(retake) (B-Global 3840x2160 HEVC AAC MKV)`;

  it(title, () => {
    expect(parse(title, { fansub: Fansub.Kirara_Fantasia })).toMatchInlineSnapshot(`
      {
        "episode": {
          "number": 536,
        },
        "fansub": {
          "alias": "黒ネズミたち",
          "name": "Kirara Fantasia",
        },
        "file": {
          "audio": {
            "term": "AAC",
          },
          "extension": "MKV",
          "video": {
            "resolution": "3840x2160",
            "term": "HEVC",
          },
        },
        "platform": "B-Global",
        "tags": [
          "retake",
        ],
        "title": "海贼王",
        "titles": [
          "One Piece",
        ],
      }
    `);
  });
});
