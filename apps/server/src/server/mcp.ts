import { McpServer as BaseMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPTransport } from '@hono/mcp';
import { z } from 'zod/v3';

import { parseURLSearch } from '@animegarden/client';

import { version } from '../../package.json';

import type { System } from '../system';
import { createConsola } from 'consola';

const searchResourcesInputSchema = z
  .object({
    fansubs: z
      .array(z.string())
      .optional()
      .describe('Fansub group names. Match ANY value (OR). Example: ["喵萌奶茶屋", "LoliHouse"].'),
    publishers: z
      .array(z.string())
      .optional()
      .describe(
        'Publisher names. Match ANY value (OR). Combined with fansubs in OR logic within this group.'
      ),
    types: z
      .array(z.enum(['动画', '合集', '音乐', '日剧', 'RAW', '漫画', '游戏', '特摄', '其他']))
      .optional()
      .describe('Resource categories. Match ANY value (OR). Common values: "动画", "合集".'),
    before: z.coerce
      .date()
      .optional()
      .describe(
        'Upper time bound (inclusive). Keep resources with createdAt <= before. Accepts date string or timestamp.'
      ),
    after: z.coerce
      .date()
      .optional()
      .describe(
        'Lower time bound (inclusive). Keep resources with createdAt >= after. Accepts date string or timestamp.'
      ),
    subjects: z
      .array(z.coerce.number().int())
      .optional()
      .describe('Bangumi subject IDs. Match ANY value (OR).'),
    search: z
      .array(z.string())
      .optional()
      .describe(
        'Full-text query terms (tokenized search). If provided, it takes precedence over include.'
      ),
    include: z
      .array(z.string())
      .optional()
      .describe(
        'Title-contains terms. Match ANY value (OR). Only effective when search is not provided.'
      ),
    keywords: z
      .array(z.string())
      .optional()
      .describe('Required title keywords. Title must contain ALL values (AND).'),
    exclude: z
      .array(z.string())
      .optional()
      .describe('Blocked title keywords. Exclude resources containing ANY value.')
  })
  .describe('Search parameters for Anime Garden resources.');

export class McpServer {
  public readonly system: System;

  public readonly mcp: BaseMcpServer;

  public readonly transport: StreamableHTTPTransport;

  public readonly logger = createConsola().withTag('mcp');

  public constructor(sys: System) {
    this.system = sys;
    this.transport = new StreamableHTTPTransport();
    this.mcp = new BaseMcpServer({
      name: 'animegarden-mcp',
      version
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

        const result = {
          status: 'OK' as const,
          ...resp
        };

        this.logger.info(`Finish searching resources`, filter);

        const summary = `Found ${result.resources.length} related anime torrent resources.`;

        return {
          content: [
            {
              type: 'text',
              text: summary
            }
          ],
          structuredContent: result
        };
      }
    );
  }
}
