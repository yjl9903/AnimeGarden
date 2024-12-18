import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '[霜庭云花Sub][命运/奇异赝品 -黎明低语- / Fate/strange Fake -Whispers of Dawn-][00v2][1080P][AVC AAC][简体字幕][WebRip]',
  `【FSD粉羽社】汪纷精彩光之美少女[45]\\美妙宠物 光之美少女\\Wonderful光之美少女\\わんだふるぷりきゅあ[中日双语]【Q娃\\precure】`,
  `[Up to 21°C] Love Live! Superstar!! 第三季 / Love Live! Superstar!! 3rd Season - 11 (ABEMA 1920x1080 AVC AAC MP4)`,
  `[GM-Team][国漫][吞噬星空][Swallowed Star][2021][149][AVC][GB][1080P]`,
  `[jibaketa合成&音頻壓制][TVB粵語]閃躍吧！星夢☆頻道 / 美妙☆频道 / Kiratto Pri-chan - 140 [粵日雙語+內封繁體中文字幕][WEB 1920x1080 AVC AACx2 SRT TVB CHT]`,
  `[Up to 21°C] 最狂輔助職業【話術士】世界最強戰團聽我號令 / Saikyou no Shienshoku 'Wajutsushi' - 12 (CR 1920x1080 AVC AAC MKV)`,
  `[SweetSub][鬼太郎誕生 咯咯咯之謎（真生版）][The Birth of Kitaro - The Mystery of GeGeGe (True Birth Edition)][Movie][BDRip][1080P][AVC 8bit][繁日雙語]`,
  `[Up to 21°C] Shibuya♡Hachi Part 2 - 21 (ABEMA 1920x1080 AVC AAC MP4)`
];

describe.only('Other', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
