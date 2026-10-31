import { z } from 'zod/v3';
import { createConsola } from 'consola';
import { HTTPException } from 'hono/http-exception';
import { StreamableHTTPTransport } from '@hono/mcp';
import {
  McpServer as BaseMcpServer,
  ResourceTemplate
} from '@modelcontextprotocol/sdk/server/mcp.js';

import { SupportProviders, parseURLSearch } from '@animegarden/client';

import packageJson from '../../../package.json' with { type: 'json' };

import type { System } from '../../system/index.ts';

import { ScraperProviders } from '../../providers/index.ts';

import {
  safeJsonStringify,
  isSupportedProvider,
  decodeURIComponentSafe,
  buildResourceUri
} from './utils.ts';
import { searchResourcesInputSchema } from './schema.ts';
import { getMcpClientInfo } from './log.ts';
import type { Context } from 'hono';

const MCP_RESOURCE_URI_TEMPLATE = 'animegarden://resources/{provider}/{providerId}';

const MCP_PROVIDER_LIST = `[${SupportProviders.join(', ')}]`;

const { version } = packageJson;

const MCP_SERVER_DESCRIPTION = [
  'Anime Garden MCP for anime torrent discovery.',
  'Capabilities:',
  '- search_resources: search aggregated resources from 動漫花園 (dmhy) / 蜜柑计划 (mikan) / 萌番组 (moe) / ANi with filter conditions, returning metadata such as title, magnet link, fansub, publisher, created timestamp, type, size, and uri.',
  `- resource_detail: read one resource by URI template ${MCP_RESOURCE_URI_TEMPLATE}.`,
  'Recommended usage for LLM agents:',
  '1) Call search_resources first to find candidates.',
  '2) Use search_resources results directly for most tasks; call resource_detail only when full description text or detailed file list is required.',
  `3) Prefer providerId from search results; provider must be one of ${MCP_PROVIDER_LIST}.`,
  'Notes:',
  '- This server focuses on retrieval; it does not download torrents.',
  '- If a resource is not found, treat it as unavailable or stale upstream data.'
].join('\n');

/** A stateless MCP server and transport owned by one HTTP request. */
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
        title:
          'Search anime torrent resources aggregated from 動漫花園, 蜜柑计划, 萌番组, ANi with Anime Garden',
        description: [
          'Search filter behavior:',
          '- Different conditions are combined with AND.',
          '- Within fansubs/publishers/types/subjects/include/exclude, values are OR.',
          '- search has higher priority than include.',
          '- keywords uses AND (all keywords must be present), exclude uses AND (all excluded words must not be present).',
          'Recommended search patterns:',
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
          limit: 30
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
                  message: `Expected URI format: animegarden://resources/{provider}/{providerId}, provider in ${MCP_PROVIDER_LIST}.`
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

  /** Preserves protocol errors and keeps the transport alive until its response stream ends. */
  public async handleRequest(c: Context) {
    const startedAt = performance.now();
    const info = getMcpClientInfo(c);
    let response: Response;
    let errorStatus: number | undefined;

    try {
      // Stateless requests have no persistent SSE stream or session to terminate.
      if (c.req.method !== 'POST') {
        throw new HTTPException(405, {
          res: c.json(
            { jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null },
            { status: 405, headers: { Allow: 'POST' } }
          )
        });
      }
      if (info.accept?.includes('text/html')) {
        throw new HTTPException(400, {
          res: c.json({ status: 'ERROR', message: 'Please connect /mcp with MCP client' }, 400)
        });
      }

      await this.mcp.connect(this.transport);

      const result = await this.transport.handleRequest(c);
      if (!result) throw new Error('MCP transport returned no response');

      response = result;
    } catch (error) {
      if (error instanceof HTTPException) {
        errorStatus = error.status;
        response = error.getResponse();
      } else {
        errorStatus = 500;
        this.logger.error('handle mcp request error', info, error);
        response = c.json({ status: 'ERROR', message: 'Internal server error' }, 500);
      }
    }

    const finish = async () => {
      // Cleanup failures must not replace the response.
      await this.mcp.close().catch((error) => {
        this.logger.error('close mcp request error', info, error);
      });

      this.logger.info('mcp request completed', {
        ...info,
        status: response.status,
        errorStatus,
        durationMs: Math.round(performance.now() - startedAt)
      });
    };

    if (response.body && response.headers.get('Content-Type')?.includes('text/event-stream')) {
      // Forward chunks with backpressure; cancellation propagates to the transport's stream.
      const stream = new TransformStream<Uint8Array, Uint8Array>();
      void response.body
        .pipeTo(stream.writable, { signal: c.req.raw.signal })
        .catch((error) => {
          if (error && !c.req.raw.signal.aborted) {
            this.logger.error('mcp response stream error', info, error);
          }
        })
        .finally(finish);
      return new Response(stream.readable, response);
    }

    await finish();
    return response;
  }
}
