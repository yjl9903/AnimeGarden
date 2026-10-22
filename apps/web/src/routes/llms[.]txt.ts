import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

import { APP_HOST, FEED_HOST } from '~build/env';

const appUrl = `https://${APP_HOST}`;
const feedUrl = `https://${FEED_HOST}`;

const llmsTxt = `# Anime Garden

Anime Garden is a third-party mirror site for 動漫花園 and an anime torrent resources aggregation platform for 動漫花園, 蜜柑计划, 萌番组, and ANi.

## Key Facts

- Primary language: Simplified Chinese
- Search supports anime resources, fansub groups, subjects, resource types, keywords, and publish time filters.
- Users can create custom RSS feeds from resource search filters.
- Public resource search requires no account.
- Site pages support Markdown negotiation: send \`Accept: text/markdown\` to receive \`Content-Type: text/markdown; charset=utf-8\`; normal browser requests still receive HTML.

## Website

- Main site: ${appUrl}
- Sitemap: ${appUrl}/sitemap-index.xml
- Resource search: ${appUrl}/resources
- Anime calendar by season: ${appUrl}/calendar/{season} (replace {season} with an available YYYY-MM season, such as 2026-10; discover available calendar URLs in the sitemap)

## HTTP API

- Public API base URL: ${feedUrl}
- API documentation: ${appUrl}/docs/api
- OpenAPI schema: ${appUrl}/openapi.json

## AI Agent Integration

### Skill

Search instructions for the public HTTP API, including resource filtering, magnet links and optional PikPak downloads. Install the skill independently:

~~~sh
npx skills add https://github.com/yjl9903/AnimeGarden --skill animegarden
~~~

### Plugin

Bundles the skill and MCP configuration. Install through the GitHub marketplace:

For Codex:

~~~sh
codex plugin marketplace add yjl9903/AnimeGarden
codex plugin add animegarden@animegarden
~~~

For Claude Code:

~~~sh
claude plugin marketplace add yjl9903/AnimeGarden
claude plugin install animegarden@animegarden
~~~

### MCP

Resource-search tools over Streamable HTTP, without authentication. Included in the plugin or configured independently.

- Endpoint: ${feedUrl}/mcp
- MCP server card: ${appUrl}/.well-known/mcp/server-card.json

Claude Code configuration:

~~~json
{
  "mcpServers": {
    "animegarden": {
      "type": "http",
      "url": "${feedUrl}/mcp"
    }
  }
}
~~~

### Optional PikPak Downloads

Save selected magnet links to PikPak and optionally download files locally. Requires a separate CLI installation and account.

- CLI installation: https://pikpakdrive.com/en-US/cli
- Login: \`pikpak auth login\`
- Optional registration with the maintainer's referral code: \`pikpak auth register --affiliate 37967274\`

## Development and Distribution

- GitHub repository: https://github.com/yjl9903/AnimeGarden

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
