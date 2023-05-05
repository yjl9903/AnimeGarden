import { describe, it, expect } from 'vitest';

import { parse } from '../src';

import { KitaujiSub } from './testcase';

describe('Kitaujisub', () => {
  it('should parse', () => {
    for (const filename of KitaujiSub) {
      const info = parse(filename);
      expect(info).toMatchSnapshot();
      expect(info?.title).toBeTruthy();
    }
  });
});
