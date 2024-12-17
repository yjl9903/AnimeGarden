import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '[北宇治字幕组] 偶像大師 閃耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [11][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 偶像大师 闪耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [11][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 地。-關於地球的運動- / Chi. Chikyuu no Undou ni Tsuite [11][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 地。-关于地球的运动- / Chi. Chikyuu no Undou ni Tsuite [11][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 地。-关于地球的运动- / Chi. Chikyuu no Undou ni Tsuite [11][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 偶像大师 闪耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [11][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 赛马娘剧场版 新时代之门 / 新时代之扉 / Uma Musume Pretty Derby Beginning of a New Era [Movie][WebRip][HEVC_AAC][简中内嵌]',
  '[北宇治字幕组] 赛马娘 第三季 / Uma Musume Pretty Derby Season 3 [12][WebRip][HEVC_AAC][简繁内封]',
  '[北宇治字幕组] 赛马娘 第三季 / Uma Musume Pretty Derby Season 3 [13][WebRip][HEVC_AAC][简繁内封]',
  '[北宇治字幕组] 赛马娘 第三季 / Uma Musume Pretty Derby Season 3 [12][WebRip][HEVC_AAC][简体内嵌]',
  '[北宇治字幕组] 赛马娘 第三季 / Uma Musume Pretty Derby Season 3 [13][WebRip][HEVC_AAC][简体内嵌]',
  '[北宇治字幕组] 賽馬娘 第三季 / Uma Musume Pretty Derby Season 3 [12][WebRip][HEVC_AAC][繁體内嵌]',
  '[北宇治字幕组] 賽馬娘 第三季 / Uma Musume Pretty Derby Season 3 [13][WebRip][HEVC_AAC][繁體内嵌]',
  '[北宇治字幕组] 偶像大師 閃耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [10][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 偶像大师 闪耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [10][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 偶像大师 闪耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [10][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 偶像大师 闪耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [09][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 偶像大師 閃耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [09][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 偶像大师 闪耀色彩 第二季 / THE IDOLM@STER SHINY COLORS S2 [09][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 地。-关于地球的运动- / Chi. Chikyuu no Undou ni Tsuite [10][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 地。-關於地球的運動- / Chi. Chikyuu no Undou ni Tsuite [10][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 地。-关于地球的运动- / Chi. Chikyuu no Undou ni Tsuite [10][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 青之箱 / 青春之箱 / 青春盒子 / 蓝箱 / Ao no Hako / Blue Box [10v2][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 青春之箱 / 青春盒子 / Ao no Hako / Blue Box [09][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 青之箱 / 蓝箱 / Ao no Hako / Blue Box [09][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 青之箱 / 青春之箱 / 青春盒子 / 蓝箱 / Ao no Hako / Blue Box [10][WebRip][HEVC_AAC][简繁日内封]',
  '[北宇治字幕组] 青春之箱 / 青春盒子 / Ao no Hako / Blue Box [10][WebRip][HEVC_AAC][繁日內嵌]',
  '[北宇治字幕组] 青之箱 / 蓝箱 / Ao no Hako / Blue Box [10][WebRip][HEVC_AAC][简日内嵌]',
  '[北宇治字幕组] 青之箱 / 青春之箱 / 青春盒子 / 蓝箱 / Ao no Hako / Blue Box [09][WebRip][HEVC_AAC][简繁日内封]  '
];

describe('Kitauji', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
