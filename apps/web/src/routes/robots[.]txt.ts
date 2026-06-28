import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

const robotsTxt = `User-agent: *
Disallow: /api/
Disallow: /feed.xml

Content-Signal: ai-train=yes, search=yes, ai-input=yes

Sitemap: https://animes.garden/sitemap-index.xml
`;

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(robotsTxt, {
          headers: {
            'Cache-Control': ResponseCacheControl.Docs,
            'Content-Type': 'text/plain; charset=utf-8'
          }
        })
    }
  }
});
