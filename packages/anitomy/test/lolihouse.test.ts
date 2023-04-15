import { describe, it, expect } from 'vitest';

import { parse } from '../src';

import { LoliHouse } from './testcase';

describe('LoliHouse', () => {
  it('should parse', () => {
    for (const filename of LoliHouse) {
      const info = parse(filename);
      expect(info).toMatchSnapshot();
      expect(info?.title).toBeTruthy();
    }
  });
});
