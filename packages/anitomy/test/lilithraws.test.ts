import { describe, it, expect } from 'vitest';

import { parse } from '../src';

import { LilithRaws } from './testcase';

describe('Lilith-Raws', () => {
  it('should parse', () => {
    for (const filename of LilithRaws) {
      const info = parse(filename);
      expect(info).toMatchSnapshot();
      expect(info?.title).toBeTruthy();
    }
  });
});
