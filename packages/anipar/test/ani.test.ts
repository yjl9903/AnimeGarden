import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const mixed = [
  '[ANi] Amagamisan Chi no Enmusubi / 結緣甘神神社 - 12 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] 妖怪學校的菜鳥老師 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] Seirei Gensouki / 精靈幻想記 2 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] 最狂輔助職業【話術士】世界最強戰團聽我號令 - 12 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
  '[ANi] 鴨乃橋論的禁忌推理 - 24 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]'
];

const feed = [
  '[ANi] ZatsuTabi Thats Journey - 隨興旅－That′s Journey－ - 02 [1080P][Baha][WEB-DL][AAC AVC][CHT]',
  '[ANi] 不會拿捏距離的阿波連同學 第二季（僅限港澳台地區） - 02 [1080P][Bilibili][WEB-DL][AAC AVC][CHT CHS]',
  '[ANi] Neko ni Tensei Shita Ojisan - 轉生成貓咪的大叔 - 27 [1080P][Baha][WEB-DL][AAC AVC][CHT]',
  '[ANi] Kakushite Makina San - 快藏好！瑪琪娜同學!! - 02 [1080P][Baha][WEB-DL][AAC AVC][CHT]',
  '[ANi] Lazarus - LAZARUS 拉撒路 - 02 [1080P][Baha][WEB-DL][AAC AVC][CHT]'
];

describe('ANi', () => {
  for (const title of mixed) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }

  for (const title of feed) {
    it(title, () => {
      expect(parse(title, { fansub: 'ANi' })).toMatchSnapshot();
    });
  }
});
