import type { Hono } from 'hono';

import type { AppEnv } from '../utils/hono.ts';

export const apiRobotsTxt = `# The API host is not intended for search-engine crawling.
User-agent: *
Disallow: /
`;

/** Prevents compliant crawlers from crawling any endpoint on the API hostname. */
export function defineRobotsRoutes(app: Hono<AppEnv>) {
  app.get('/robots.txt', (c) => {
    return c.text(apiRobotsTxt, 200, {
      'Cache-Control': 'public, max-age=86400'
    });
  });
}
