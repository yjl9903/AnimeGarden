import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '[遮天][第88集][国语中字][WEB-MKV][2160P]',
  '[徒弟个个是大佬][第17集][国语中字][WEB-MKV][2160P]',
  '[长生界][第9集][国语中字][WEB-MKV][2160P]',
  '[炼气十万年][第193集][国语中字][WEB-MKV][2160P]',
  '[吞噬星空][第150集][国语中字][WEB-MKV][2160P]',
  '[宗门里除了我都是卧底][第24集][国语中字][WEB-MKV][2160P]',
  '[剑来][全26集][国语中字][WEB-MKV][2160P]',
  '[仙逆][第67集][国语中字][WEB-MKV][2160P]',
  '[牧神记][第9集][国语中字][WEB-MKV][2160P]',
  '[斗破苍穹年番][第125集][国语中字][WEB-MKV][2160P]'
];

describe('mmimages', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
