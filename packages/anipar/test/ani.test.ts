import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '[ANi] Amagamisan Chi no Enmusubi / 結緣甘神神社 - 12 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] 妖怪學校的菜鳥老師 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] Seirei Gensouki / 精靈幻想記 2 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] 最狂輔助職業【話術士】世界最強戰團聽我號令 - 12 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] 鴨乃橋論的禁忌推理 - 24 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]'
];

describe('ANi', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
