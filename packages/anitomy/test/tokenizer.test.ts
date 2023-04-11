import { describe, it, expect } from 'vitest';

import { tokenize } from '../src/tokenizer';
import { resolveOptions } from '../src';

import { filesnames } from './testcase';

describe('tokenize', () => {
  it('should work', () => {
    for (const filename of filesnames) {
      expect(tokenize(filename, resolveOptions({}))).toMatchSnapshot();
    }
  });
});
