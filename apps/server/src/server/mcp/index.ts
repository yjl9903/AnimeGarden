import { z } from 'zod/v3';
import { createConsola } from 'consola';
import { StreamableHTTPTransport } from '@hono/mcp';
import {
  McpServer as BaseMcpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js';

import { parseURLSearch } from '@animegarden/client';

import { version } from '../../../package.json';

import type { System } from '../../system';

import { ScraperProviders } from '../../providers';

import {
  safeJsonStringify,
  isSupportedProvider,
  decodeURIComponentSafe,
  buildResourceUri
} from './utils';
import { searchResourcesInputSchema } from './schema';
import { Context } from 'hono';

const MCP_RESOURCE_URI_TEMPLATE = 'animegarden://resources/{provider}/{providerId}';

const MCP_SERVER_DESCRIPTION = [
  'Anime Garden MCP for anime torrent discovery and detail lookup.',
  'Capabilities:',
  '- search_resources: search aggregated resources from dmhy/moe/ani with filter conditions, returning metadata such as title, magnet link, fansub, publisher, created timestamp, type, size, and uri.',
  `- resource_detail: read one resource by URI template ${MCP_RESOURCE_URI_TEMPLATE}.`,
  'Recommended usage for LLM agents:',
  '1) Call search_resources first to find candidates.',
  '2) Use search_resources results directly for most tasks; call resource_detail only when full description text or detailed file list is required.',
  '3) Prefer providerId from search results; provider must be one of [dmhy, moe, ani].',
  'Notes:',
  '- This server focuses on retrieval; it does not download torrents.',
  '- If a resource is not found, treat it as unavailable or stale upstream data.'
].join('\n');

export class McpServer {
  private readonly system: System;

  private readonly mcp: BaseMcpServer;

  private readonly logger = createConsola().withTag('mcp');

  private readonly transport: StreamableHTTPTransport;

  public constructor(sys: System) {
    this.system = sys;

    this.transport = new StreamableHTTPTransport();

    this.mcp = new BaseMcpServer({
      name: 'animegarden',
      version,
      description: MCP_SERVER_DESCRIPTION,
      websiteUrl: `https://${sys.options.site ?? 'animes.garden'}`,
      icons: [
        {
          src: 'https://animes.garden/favicon.svg',
          mimeType: 'image/svg+xml',
          sizes: ['any']
        }
      ]
    });

    this.mcp.registerTool(
      'search_resources',
      {
        title: 'Search anime torrent resources from 動漫花園, 萌番组, Ani with Anime Garden',
        description: [
          'Search anime torrent resources aggregated from 動漫花園 (dmhy), 萌番组 (moe), and Ani.',
          'Filter behavior:',
          '- Different conditions are combined with AND.',
          '- Within fansubs/publishers/types/subjects/include/exclude, values are OR.',
          '- search has higher priority than include.',
          '- keywords uses AND (all keywords must be present), exclude uses AND (all excluded words must not be present).',
          'Recommended query patterns:',
          '1) Latest episode releases:',
          '{"types":["动画"]}',
          '2) Specific show + quality + codec:',
          '{"search":["Re:Zero"],"keywords":["1080p","HEVC"]}',
          '3) Fansub-focused browsing:',
          '{"fansubs":["LoliHouse"],"types":["动画"],"after":"2026-02-01"}',
          '4) Subject tracking with cleanup terms:',
          '{"subjects":[123456],"exclude":["合集","NCOP","NCED"]}'
        ].join('\n'),
        inputSchema: searchResourcesInputSchema
      },
      async (args: z.infer<typeof searchResourcesInputSchema>) => {
        const { filter } = parseURLSearch(undefined, args);

        this.logger.info(`Start searching resources`, filter);

        const resp = await this.system.modules.resources.query.find(filter, {
          page: 1,
          pageSize: 30
        });

        const result = resp.resources.map((r) => ({
          id: r.id,
          provider: r.provider,
          providerId: r.providerId,
          title: r.title,
          uri: buildResourceUri(r.provider, r.providerId),
          href: `https://${sys.options.site ?? 'animes.garden'}/detail/${r.provider}/${r.providerId}`,
          type: r.type,
          magnet: `${r.magnet}${r.tracker}`,
          size: r.size,
          createdAt: r.createdAt,
          publisher: r.publisher.name,
          fansub: r.fansub?.name
        }));

        this.logger.info(`Finish searching resources`, filter);

        return {
          content: [
            {
              type: 'text',
              text: safeJsonStringify(result)
            }
          ],
          structuredContent: {
            resources: result
          }
        };
      }
    );

    this.mcp.registerResource(
      'resource_detail',
      new ResourceTemplate(MCP_RESOURCE_URI_TEMPLATE, { list: undefined }),
      {
        title: 'Anime Garden Resource Detail',
        description:
          'Read full resource detail by provider and providerId. Use only when full description text or file list is needed.',
        mimeType: 'application/json'
      },
      async (uri, variables) => {
        const provider = String(variables.provider ?? '');
        const providerId = decodeURIComponentSafe(String(variables.providerId ?? ''));

        if (!providerId || !isSupportedProvider(provider)) {
          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'application/json',
                text: safeJsonStringify({
                  error: 'INVALID_RESOURCE_URI',
                  uri: uri.toString(),
                  message:
                    'Expected URI format: animegarden://resources/{provider}/{providerId}, provider in [dmhy, moe, ani].'
                })
              }
            ]
          };
        }

        this.logger.info(`Start fetching resource detail`, provider, providerId);

        const detail = await this.system.modules.resources.details.getByProviderId(
          provider,
          providerId,
          async () => {
            const scraperProvider = ScraperProviders.get(provider);
            if (!scraperProvider) return undefined;

            const detailURL = await scraperProvider.getDetailURL(this.system, providerId);
            if (!detailURL) return undefined;

            return await scraperProvider.fetchResourceDetail(this.system, detailURL.href);
          }
        );

        if (!detail.resource || !detail.detail) {
          this.logger.info(
            `Failed fetching resource detail due to NOT FOUND`,
            provider,
            providerId
          );

          return {
            contents: [
              {
                uri: uri.toString(),
                mimeType: 'application/json',
                text: safeJsonStringify({
                  error: 'RESOURCE_NOT_FOUND',
                  provider,
                  providerId
                })
              }
            ]
          };
        }

        this.logger.info(`Finish fetching resource detail`, provider, providerId);

        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: 'application/json',
              text: safeJsonStringify({
                id: detail.resource.id,
                provider,
                providerId,
                title: detail.resource.title,
                uri: buildResourceUri(provider, providerId),
                href: `https://${sys.options.site ?? 'animes.garden'}/detail/${provider}/${providerId}`,
                type: detail.resource.type,
                magnet: `${detail.resource.magnet}${detail.resource.tracker}`,
                size: detail.resource.size,
                createdAt: detail.resource.createdAt,
                publisher: detail.resource.publisher.name,
                fansub: detail.resource.fansub?.name,
                description: detail.detail.description,
                files: detail.detail.files,
                hasMoreFiles: detail.detail.hasMoreFiles
              })
            }
          ]
        };
      }
    );
  }

  public isConnected() {
    return this.mcp.isConnected();
  }

  public async connect() {
    return this.mcp.connect(this.transport);
  }

  public async handleRequest(c: Context) {
    // Connect the mcp with the transport
    if (!this.mcp.isConnected()) {
      await this.mcp.connect(this.transport);
    }
    // Handle mcp request
    return this.transport.handleRequest(c);
  }
}
