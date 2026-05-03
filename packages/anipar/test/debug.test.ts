import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

describe('debug', () => {
  const title = `[桜都字幕组][公主连结 Re:Dive/Princess Connect! Re:Dive][13 END][BIG5][1080P]`;

  it(title, () => {
    expect(parse(title, { fansub: Fansub.桜都字幕组 })).toMatchInlineSnapshot(`
      {
        "episode": {
          "number": 13,
          "type": "END",
        },
        "fansub": {
          "name": "桜都字幕组",
        },
        "file": {
          "video": {
            "resolution": "1080P",
          },
        },
        "subtitle": {
          "encoding": "BIG5",
        },
        "title": "公主连结 Re:Dive",
        "titles": [
          "Princess Connect! Re:Dive",
        ],
      }
    `);
  });
});
