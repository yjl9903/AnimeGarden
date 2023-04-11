import { describe, it, expect } from 'vitest';

import { trim } from '../src/utils';

describe('trim', () => {
  it('should work', () => {
    expect(trim('  a   b   ', [' '])).toBe('a   b');
    expect(trim('  -  a   -   b   -   ', [' ', '-'])).toBe('a   -   b');
  });
});
