import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import CalendarPage from '../src/pages/anime/route';
import type { WebBgmSubject } from '../src/utils/subject';

vi.mock('~/layouts/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    className
  }: {
    children: ReactNode;
    params: { subject: string };
    className: string;
  }) => (
    <a href={`/subject/${params.subject}`} className={className}>
      {children}
    </a>
  )
}));
vi.mock('~/utils', () => ({ trackAnimeCalendarClick: vi.fn() }));

describe('calendar WEB section', () => {
  it('renders a WEB anchor and the existing card style after all weekdays', () => {
    const web: WebBgmSubject = {
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
    const html = renderToStaticMarkup(
      <CalendarPage
        calendar={[...Array.from({ length: 7 }, () => []), [web]]}
        calendars={[]}
        season="2026-10"
        onSeasonChange={() => {}}
      />
    );
    expect(html).toContain('href="#WEB"');
    expect(html).toContain('id="WEB"');
    expect(html).toContain('href="/subject/513878" class="anime-card group"');
    expect(html).toContain('赛博朋克：边缘行者 2');
    expect(html.match(/<section /g)).toHaveLength(8);
    expect(html.lastIndexOf('<section ')).toBe(
      html.indexOf('<section class="bgm-weekday" id="WEB"')
    );
  });
});
