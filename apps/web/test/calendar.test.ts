import { describe, expect, it } from 'vitest';

import { getCalendar } from '../src/utils/calendar';

const emptyWeek = Array.from({ length: 7 }, () => []);

describe('calendar utils', () => {
  it('orders weekdays by Shanghai time with a 6am day boundary', () => {
    expect(getCalendar(emptyWeek, new Date('2026-06-28T16:30:00.000Z'))[0].text).toBe('日');
    expect(getCalendar(emptyWeek, new Date('2026-06-28T22:30:00.000Z'))[0].text).toBe('一');
  });
});
