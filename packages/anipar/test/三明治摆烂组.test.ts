import { describe, it, expect } from 'vitest';

import { Fansub, parse } from '../src/index.js';

import { readTestAsset } from './utils.js';

const fansub = Fansub.三明治摆烂组;

const titles = readTestAsset(fansub);

describe(fansub, () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title, { fansub })).toMatchSnapshot();
    });
  }
});
