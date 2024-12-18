import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '[霜庭云花Sub][命运/奇异赝品 -黎明低语- / Fate/strange Fake -Whispers of Dawn-][00v2][1080P][AVC AAC][简体字幕][WebRip]',
  `【FSD粉羽社】汪纷精彩光之美少女[45]\\美妙宠物 光之美少女\\Wonderful光之美少女\\わんだふるぷりきゅあ[中日双语]【Q娃\\precure】`
];

describe.only('Other', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
