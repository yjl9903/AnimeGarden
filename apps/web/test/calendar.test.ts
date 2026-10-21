import { describe, expect, it } from 'vitest';

import { getCalendar } from '../src/utils/calendar';

const emptyWeek = Array.from({ length: 7 }, () => []);

describe('calendar utils', () => {
  it('orders weekdays by Shanghai time with a 6am day boundary', () => {
    expect(getCalendar(emptyWeek, new Date('2026-06-28T16:30:00.000Z'))[0].text).toBe('日');
    expect(getCalendar(emptyWeek, new Date('2026-06-28T22:30:00.000Z'))[0].text).toBe('一');
  });
  it('keeps WEB last without repeating a weekday when the week rotates', () => {
    const web = {
      id: 513878,
      title: '赛博朋克：边缘行者 2',
      platform: 'WEB',
      summary: '',
      alias: {},
      search: { include: [] },
      poster: '/poster.jpeg',
      tags: [],
      onair_date: '2026-10-20'
    };
    const calendar = [...emptyWeek, [web]];
    for (const date of ['2026-10-20T04:00:00Z', '2026-10-24T04:00:00Z']) {
      const sections = getCalendar(calendar, new Date(date));
      expect(sections).toHaveLength(8);
      expect(new Set(sections.slice(0, 7).map((section) => section.text)).size).toBe(7);
      expect(sections[7]).toMatchObject({ text: 'WEB', bangumis: [web] });
    }
  });
});
