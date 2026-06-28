import { createFileRoute } from '@tanstack/react-router';

import { ResponseCacheControl } from '~/utils/response';

import { version } from '~build/package';
import { APP_HOST, FEED_HOST } from '~build/env';

function getMcpServerCard() {
  const mcpUrl = `https://${FEED_HOST}/mcp`;

  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: 'garden.animes/animegarden',
    version,
    title: 'Anime Garden MCP',
    description: 'Search Anime Garden torrent resources.',
    websiteUrl: `https://${APP_HOST}`,
    repository: {
      source: 'github',
      url: 'https://github.com/yjl9903/AnimeGarden',
      subfolder: 'apps/server'
    },
    icons: [
      {
        src: 'https://animes.garden/favicon.svg',
        mimeType: 'image/svg+xml',
        sizes: ['any']
      }
    ],
    remotes: [
      {
        type: 'streamable-http',
        url: mcpUrl
      }
    ],
    serverInfo: {
      name: 'animegarden',
      version
    },
    transport: {
      type: 'streamable-http',
      endpoint: '/mcp',
      url: mcpUrl
    },
    capabilities: {
      tools: true,
      resources: true,
      prompts: false
    },
    _meta: {
      'garden.animes/primitives': {
        tools: ['search_resources'],
        resources: ['resource_detail'],
        prompts: []
      }
    }
  };
}

export const Route = createFileRoute('/.well-known/mcp/server-card.json')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(getMcpServerCard(), {
          headers: {
            'Cache-Control': ResponseCacheControl.Docs
          }
        })
    }
  }
});
