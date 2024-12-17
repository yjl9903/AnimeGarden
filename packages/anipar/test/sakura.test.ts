import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '[桜都字幕组] 超自然武装当哒当 / Dan Da Dan [11][1080p][简繁内封]',
  '[桜都字幕組] 膽大黨 / Dan Da Dan [11][1080p][繁體內嵌]',
  '[桜都字幕组] 超自然武装当哒当 / Dan Da Dan [11][1080p][简体内嵌]',
  '[桜都字幕組] 常軌脫離Creative / Hamidashi Creative [11][1080p][繁體內嵌]',
  '[桜都字幕组] 常轨脱离Creative / Hamidashi Creative [11][1080p][简繁内封]',
  '[桜都字幕组] 常轨脱离Creative / Hamidashi Creative [11][1080p][简体内嵌]',
  '[桜都字幕组] 在地下城寻求邂逅是否搞错了什么 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V [10][1080p][简繁内封][v2]',
  '[桜都字幕組] 在地下城尋求邂逅是否搞錯了什麼 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V  [10][1080P][繁體內嵌][v2]',
  '[桜都字幕组] 在地下城寻求邂逅是否搞错了什么 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V [10][1080p][简体内嵌][v2]',
  '[桜都字幕组] 在地下城寻求邂逅是否搞错了什么 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V [10][1080p][简体内嵌]',
  '[桜都字幕組] 在地下城尋求邂逅是否搞錯了什麼 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V [10][1080P][繁體內嵌]',
  '[桜都字幕组] 在地下城寻求邂逅是否搞错了什么 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V [10][1080p][简繁内封]',
  '[桜都字幕組] BLEACH 死神 千年血戰篇 -相剋譚- / Bleach：Sennen Kessen Hen - Soukoku Tan [10][1080p][繁體內嵌]',
  '[桜都字幕组] BLEACH 死神 千年血战篇 -相克谭- / Bleach：Sennen Kessen Hen - Soukoku Tan [10][1080p][简体内嵌]',
  '[桜都字幕组] BLEACH 死神 千年血战篇 -相克谭- / Bleach：Sennen Kessen Hen - Soukoku Tan [10][1080p][简繁内封]',
  '[桜都字幕組] 大正偽婚～替身新娘與軍服的猛愛 / Taishou Itsuwari Bridal： Migawari Hanayome to Gunpuku no Mou Ai [08][1080p][繁體內嵌]',
  '[桜都字幕组] 大正伪婚～替身新娘与军服的猛爱 / Taishou Itsuwari Bridal： Migawari Hanayome to Gunpuku no Mou Ai [08][1080p][简体内嵌]',
  '[桜都字幕组] 大正伪婚～替身新娘与军服的猛爱 / Taishou Itsuwari Bridal： Migawari Hanayome to Gunpuku no Mou Ai [08][1080p][简繁内封]',
  '[桜都字幕组] 亦叶亦花 / Nanare Hananare [01-12END][1080p][简体内嵌]',
  '[桜都字幕组] 亦叶亦花 / Nanare Hananare [01-12][1080p][简繁内封]',
  '[桜都字幕組] 少女如草花綻放 / Nanare Hananare [01-12][1080p][繁體內嵌]',
  '[桜都字幕組] 妻子变成小学生。 / Tsuma, Shougakusei ni Naru  [11][1080p][简体內嵌]',
  '[桜都字幕組] 妻子變成小學生。 / Tsuma, Shougakusei ni Naru  [11][1080p][繁体内嵌]',
  '[桜都字幕組] 妻子变成小学生。 / Tsuma, Shougakusei ni Naru  [11][1080p][简繁内封]',
  '[桜都字幕组] 在地下城寻求邂逅是否搞错了什么 第五季 / Dungeon ni Deai o Motomeru no wa Machigatte Iru Darouka： Familia Myth V [09][1080p][简体内嵌]'
];

describe('sakura', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
