import { describe, expect, it } from 'vitest';

import { getWeekday } from '../src/utils/date';

describe('date utils', () => {
  it('gets weekday from date-only strings without local timezone drift', () => {
    expect(getWeekday('2025-07-17')).toBe('星期四');
    expect(getWeekday('2025-07-20')).toBe('星期日');
  });

  it('returns empty text for invalid dates', () => {
    expect(getWeekday('invalid')).toBe('');
  });
});
