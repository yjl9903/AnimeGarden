import { describe, it, expect } from 'vitest';

import { parse } from '../src';

import { filesnames } from './testcase';

describe('parse', () => {
  it('should work', () => {
    for (const filename of filesnames) {
      expect(parse(filename)).toMatchSnapshot();
    }
  });
});
