import { describe, it, expect } from 'vitest';

import { parse } from '../src';

import { LilithRaws } from './testcase';

describe('Lilith-Raws', () => {
  it('should parse', () => {
    for (const filename of LilithRaws) {
      expect(parse(filename)).toMatchSnapshot();
    }
  });
});
