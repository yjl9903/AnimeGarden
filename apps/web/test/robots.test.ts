import { describe, expect, it } from 'vitest';

import { RobotsDisallowPaths, robotsTxt } from '../src/routes/robots[.]txt';

describe('robots.txt', () => {
  it('blocks non-search utility routes from REP-compliant crawlers', () => {
    expect(RobotsDisallowPaths).toEqual(['/api/', '/iframe', '/collection/']);
    for (const path of RobotsDisallowPaths) {
      expect(robotsTxt).toContain(`Disallow: ${path}`);
    }
  });

  it('keeps noindex pages crawlable when crawlers must see the directive', () => {
    expect(robotsTxt).not.toContain('Disallow: /about');
  });

  it('publishes the sitemap and content-use signal', () => {
    expect(robotsTxt).toContain('Sitemap: https://animes.garden/sitemap-index.xml');
    expect(robotsTxt).toContain('Content-Signal: ai-train=yes, search=yes, ai-input=yes');
  });
});
