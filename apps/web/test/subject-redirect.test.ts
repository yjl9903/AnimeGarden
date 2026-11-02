import { describe, expect, it } from 'vitest';

import { Route } from '../src/routes/subject/$subject/$page';

describe('legacy Subject pagination links', () => {
  it.each([
    { page: '1', searchStr: '' },
    { page: '2', searchStr: '?fansub=ANi&keyword=1080p' },
    { page: '99', searchStr: '?fansub=A%26B&keyword=%E7%AE%80%E4%BD%93' }
  ])('redirects page $page while preserving the query string', ({ page, searchStr }) => {
    expect(() =>
      Route.options.beforeLoad!({
        params: { subject: '543360', page },
        location: { searchStr }
      } as never)
    ).toThrow(
      expect.objectContaining({
        status: 308,
        options: expect.objectContaining({
          href: `/subject/543360${searchStr}`,
          replace: true
        })
      })
    );
  });
});
