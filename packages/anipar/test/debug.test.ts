import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

describe('debug', () => {
  const title = `[Up to 21°C] 女神降临（日配版） / Yeosin Gangnim (Japanese Audio) - 09 (ABEMA 1920x1080 AVC AAC MP4)
`;

  it(title, () => {
    expect(parse(title, { fansub: Fansub.Kirara_Fantasia })).toMatchInlineSnapshot(`
      {
        "episode": {
          "number": 9,
        },
        "fansub": {
          "alias": "Up to 21°C",
          "name": "Kirara Fantasia",
        },
        "file": {
          "audio": {
            "term": "AAC",
          },
          "extension": "MP4",
          "video": {
            "resolution": "1920x1080",
            "term": "AVC",
          },
        },
        "platform": "ABEMA",
        "title": "女神降临",
        "titles": [
          "Yeosin Gangnim",
        ],
        "variants": [
          "日配版",
          "Japanese Audio",
        ],
      }
    `);
  });
});
