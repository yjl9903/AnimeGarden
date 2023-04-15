import { describe, it, expect } from 'vitest';

import { parse } from '../src';

import { other } from './testcase';

describe('Other filenames', () => {
  it('should parse', () => {
    for (const filename of other) {
      const info = parse(filename);
      expect(info).toMatchSnapshot();
      expect(info?.title).toBeTruthy();
    }
  });
});
