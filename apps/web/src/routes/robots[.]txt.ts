import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

export const RobotsDisallowPaths = ['/api/', '/iframe', '/collection/'] as const;

export const robotsTxt = `# Crawl rules for Robots Exclusion Protocol compliant crawlers.
User-agent: *
${RobotsDisallowPaths.map((path) => `Disallow: ${path}`).join('\n')}

# This is a separate content-use signal; unsupported robots.txt parsers ignore it.
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
