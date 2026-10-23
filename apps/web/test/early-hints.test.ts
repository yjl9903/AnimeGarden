import { describe, expect, it, vi } from 'vitest';
import type { ResponseLinkHeaderEntry } from '@tanstack/react-start/server';

import { createEarlyHintLinkFilter } from '../src/utils/server/early-hints';

const { fetchHandler } = vi.hoisted(() => ({ fetchHandler: vi.fn() }));

vi.mock('@tanstack/react-start/server-entry', () => ({
  default: { fetch: fetchHandler },
  createServerEntry: (entry: unknown) => entry
}));

import server from '../src/server';

/** Builds filter input without coupling tests to Start's Link serialization. */
function entry(
  hint: ResponseLinkHeaderEntry['hint'],
  phase: ResponseLinkHeaderEntry['phase'] = 'static'
): ResponseLinkHeaderEntry {
  return { phase, hint, link: `<${hint.href}>; rel=${hint.rel}` };
}

/** Represents a hashed stylesheet emitted by the production build manifest. */
function stylesheet(href: string) {
  return entry({ rel: 'preload', as: 'style', href });
}

describe('Early Hints Link filter', () => {
  it.each(['static', 'dynamic'] as const)('keeps preconnects in the %s phase', (phase) => {
    const filter = createEarlyHintLinkFilter();

    for (const hint of [
      { rel: 'preconnect', href: 'https://fonts.bunny.net' },
      { rel: 'preconnect', href: 'https://fonts.bunny.net', crossOrigin: '' },
      { rel: 'preconnect', href: 'https://api.fontshare.com' },
      { rel: 'preconnect', href: 'https://cdn.fontshare.com', crossOrigin: '' }
    ] as const) {
      expect(filter(entry(hint, phase))).toBe(true);
    }
  });

  it('keeps hashed main and route CSS preloads from /assets/', () => {
    const filter = createEarlyHintLinkFilter();

    expect(filter(stylesheet('/assets/index-Ab12.css'))).toBe(true);
    expect(filter(stylesheet('/assets/calendar-Cd34.css'))).toBe(true);
  });

  it('discards modulepreloads in both phases', () => {
    const filter = createEarlyHintLinkFilter();
    const hint = { rel: 'modulepreload', href: '/assets/route-Ab12.js' } as const;

    expect(filter(entry(hint, 'static'))).toBe(false);
    expect(filter(entry(hint, 'dynamic'))).toBe(false);
  });

  it.each([
    'https://fonts.bunny.net/css?family=ibm-plex-sans&display=swap',
    'https://api.fontshare.com/v2/css?f[]=quicksand&display=swap',
    'https://example.com/assets/font-Ab12.css',
    '//example.com/assets/font-Ab12.css'
  ])('discards cross-origin stylesheet preload %s', (href) => {
    const filter = createEarlyHintLinkFilter();

    expect(filter(stylesheet(href))).toBe(false);
    expect(filter(entry({ rel: 'preload', as: 'style', href }, 'dynamic'))).toBe(false);
  });

  it('discards dynamic CSS, non-build assets, and other hints', () => {
    const filter = createEarlyHintLinkFilter();

    expect(
      filter(entry({ rel: 'preload', as: 'style', href: '/assets/route-Ab12.css' }, 'dynamic'))
    ).toBe(false);
    expect(filter(stylesheet('/styles/main.css'))).toBe(false);
    expect(filter(stylesheet('/assets/route-Ab12.js'))).toBe(false);
    expect(filter(entry({ rel: 'preload', as: 'script', href: '/assets/main-Ab12.js' }))).toBe(
      false
    );
    expect(filter(entry({ rel: 'preload', as: 'font', href: '/assets/font-Ab12.woff2' }))).toBe(
      false
    );
    expect(filter(entry({ rel: 'dns-prefetch', href: 'https://fonts.bunny.net' }))).toBe(false);
  });

  it('keeps only the first three eligible CSS links without counting other hints', () => {
    const filter = createEarlyHintLinkFilter();
    const css = ['main', 'route', 'shared', 'extra'].map((name) =>
      stylesheet(`/assets/${name}-Ab12.css`)
    );
    const preconnect = entry({ rel: 'preconnect', href: 'https://fonts.bunny.net' }, 'dynamic');

    expect(filter(stylesheet('https://example.com/assets/ignored.css'))).toBe(false);
    expect(filter(preconnect)).toBe(true);
    expect(css.filter(filter)).toEqual(css.slice(0, 3));
    expect(filter(preconnect)).toBe(true);
  });

  it('isolates the CSS limit between requests', () => {
    const first = createEarlyHintLinkFilter();
    const second = createEarlyHintLinkFilter();

    for (let index = 0; index < 3; index++) {
      expect(first(stylesheet(`/assets/route-${index}.css`))).toBe(true);
    }

    expect(first(stylesheet('/assets/extra-Ab12.css'))).toBe(false);
    expect(second(stylesheet('/assets/main-Ab12.css'))).toBe(true);
  });

  it('passes request options and a fresh filter to the default handler for every request', async () => {
    const request = new Request('https://animes.garden/');
    const response = new Response('HTML');
    fetchHandler.mockReturnValue(response);

    expect(await server.fetch(request, { context: { nonce: 'test' } })).toBe(response);
    expect(fetchHandler).toHaveBeenLastCalledWith(request, {
      context: { nonce: 'test' },
      responseLinkHeader: { filter: expect.any(Function) }
    });
    const first = fetchHandler.mock.lastCall![1].responseLinkHeader.filter;
    for (let index = 0; index < 4; index++) {
      first(stylesheet(`/assets/route-${index}.css`));
    }

    await server.fetch(request);
    const second = fetchHandler.mock.lastCall![1].responseLinkHeader.filter;

    expect(second).not.toBe(first);
    expect(second(stylesheet('/assets/main-Ab12.css'))).toBe(true);
  });
});
