import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

import { APP_HOST, FEED_HOST } from '~build/env';

const appUrl = `https://${APP_HOST}`;
const feedUrl = `https://${FEED_HOST}`;

const llmsTxt = `# Anime Garden

> Anime Garden is a third-party mirror site for 動漫花園 and an anime torrent resources aggregation platform for 動漫花園, 蜜柑计划, 萌番组, and ANi.

## Key Facts
- Primary language: Simplified Chinese
- Main site: ${appUrl}
- Public API host: ${feedUrl}
- Search supports anime resources, fansub groups, subjects, resource types, keywords, and publish time filters.
- Users can create custom RSS feeds from resource search filters.
- Anime Garden provides an MCP endpoint for AI clients.

## Important Links
- Resource search: ${appUrl}/resources
- Anime calendar: ${appUrl}/anime
- API documentation: ${appUrl}/docs/api
- OpenAPI schema: ${appUrl}/openapi.json
- MCP server card: ${appUrl}/.well-known/mcp/server-card.json
- MCP endpoint: ${feedUrl}/mcp
- Sitemap: ${appUrl}/sitemap-index.xml
- GitHub repository: https://github.com/yjl9903/AnimeGarden

## API Entry Points
- Search resources: ${feedUrl}/resources
- Subject sitemap data: ${feedUrl}/sitemaps/subjects

## Contact
- Telegram group: https://t.me/animegarden_dev
- Telegram channel: https://t.me/animegarden_channel
`;

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(llmsTxt, {
          headers: {
            'Cache-Control': ResponseCacheControl.Docs,
            'Content-Type': 'text/plain; charset=utf-8'
          }
        })
    }
  }
});
