import { describe, expect, it, vi } from 'vitest';
import { decodeResourcesCursor, encodeResourcesCursor } from '../src/cursor';

describe('internal resource cursor codec', () => {
  it.each([
    { anchor: 0 },
    { anchor: 1782864000000 },
    { anchor: 1782864000000, position: { createdAt: 1782863000000, id: 42 } }
  ])('round-trips deterministically without Buffer: %j', (cursor) => {
    vi.stubGlobal('Buffer', undefined);
    try {
      const token = encodeResourcesCursor(cursor);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(encodeResourcesCursor(cursor)).toBe(token);
      expect(decodeResourcesCursor(token)).toEqual(cursor);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    '[1]',
    '[1,0,1]',
    '[1,0,null,null]',
    '[1,0,1,0]',
    '[1,0,1,1.5]',
    '[1,"0"]',
    '[1,null]',
    '[2,0]',
    '[1,8640000000000001]',
    '[1,0,1,1,1]',
    '[1, 0]',
    '[1,0.0]'
  ])('rejects malformed or noncanonical payload %s', (payload) => {
    const token = btoa(payload).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
    expect(() => decodeResourcesCursor(token)).toThrow();
  });

  it('rejects padding, invalid characters and unbounded tokens', () => {
    const token = encodeResourcesCursor({ anchor: 0 });
    for (const invalid of ['', `${token}=`, `${token}\n`, '!', 'a'.repeat(257)]) {
      expect(() => decodeResourcesCursor(invalid)).toThrow();
    }
  });
});
