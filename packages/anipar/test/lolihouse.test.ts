import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

import { readTestAsset } from './utils.js';

const fansub = Fansub.LoliHouse;

const titles = readTestAsset(fansub);

/**
 * 接受 badcase:
 * - 不是正常的动画资源格式: [LoliHouse] 萝莉工坊三周年礼包 (其一) 图包&壁纸 / LoliHouse 3rd Anniversary Gift (Part 1) Picture Package & Wallpaper 112GB
 */
describe(fansub, () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title, { fansub })).toMatchSnapshot();
    });
  }
});
