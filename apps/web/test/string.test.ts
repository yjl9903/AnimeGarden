import { describe, expect, it } from 'vitest';

import { parseSize } from '../src/utils/string';

describe('parseSize', () => {
  it('formats byte-based resource sizes', () => {
    expect(parseSize(512)).toBe('512 B');
    expect(parseSize(1536)).toBe('1.50 KB');
    expect(parseSize(1572864)).toBe('1.50 MB');
    expect(parseSize(1610612736)).toBe('1.50 GB');
  });
});
