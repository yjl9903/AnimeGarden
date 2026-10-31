// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { getTrackAttributes } from '../src/utils/umami';

describe('tracking attributes in HTML', () => {
  it('preserves eligible payload keys through React rendering and HTML parsing', () => {
    const payload = { resource: 'dmhy:123', source: 'play' };
    const html = renderToStaticMarkup(
      <a href="/play" {...getTrackAttributes('pikpak', payload)}>
        Play
      </a>
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    const link = container.querySelector('a')!;

    // Umami reads field names from DOM attributes, not from the original props object.
    const data = Object.fromEntries(
      link.getAttributeNames().flatMap((name) => {
        const match = name.match(/^data-umami-event-([\w-]+)$/);
        return match ? [[match[1], link.getAttribute(name)]] : [];
      })
    );

    expect(link.getAttribute('data-umami-event')).toBe('pikpak');
    expect(data).toEqual(payload);
  });
});
