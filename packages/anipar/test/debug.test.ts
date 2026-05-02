import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

describe('debug', () => {
  const title = `[LoliHouse] 佐佐木与宫野 / Sasaki to Miyano [01-12 合集][WebRip 1080p HEVC-10bit AAC ASSx2][简繁内封字幕][Fin]`;

  it(title, () => {
    expect(parse(title, { fansub: Fansub.LoliHouse })).toMatchInlineSnapshot(`
      {
        "episodeRange": {
          "from": 1,
          "to": 12,
          "type": "合集",
        },
        "fansub": {
          "name": "LoliHouse",
        },
        "file": {
          "audio": {
            "term": "AAC",
          },
          "video": {
            "resolution": "1080p",
            "term": "HEVC-10bit",
          },
        },
        "language": "简繁",
        "source": "WebRip",
        "subtitles": "内封字幕",
        "tags": [
          "Fin",
        ],
        "title": "佐佐木与宫野",
        "titles": [
          "Sasaki to Miyano",
        ],
      }
    `);
  });
});
