import { describe, expect, it } from 'vitest';

import { shouldOverwriteSubjectId } from '../src/resources';

describe('resource subject id upsert policy', () => {
  it('preserves an existing subject id when re-indexing has no match by default', () => {
    expect(shouldOverwriteSubjectId(123, null)).toBe(false);
    expect(shouldOverwriteSubjectId(123, undefined)).toBe(false);
  });

  it('allows an existing subject id to be cleared when explicitly requested', () => {
    expect(shouldOverwriteSubjectId(123, null, true)).toBe(true);
    expect(shouldOverwriteSubjectId(123, undefined, true)).toBe(false);
  });

  it('still writes newly matched and changed subject ids', () => {
    expect(shouldOverwriteSubjectId(null, 123)).toBe(true);
    expect(shouldOverwriteSubjectId(123, 456)).toBe(true);
    expect(shouldOverwriteSubjectId(123, 123)).toBe(false);
  });
});
