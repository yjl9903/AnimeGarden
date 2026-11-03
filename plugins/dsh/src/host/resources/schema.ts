/**
 * Model-facing contract of the `animegarden_search_resources` tool: the English
 * tool description and the enforced JSON Schemas for arguments and structured
 * output.
 *
 * Both schemas stay inside the JSON Schema subset the DSH tool registry
 * enforces (`type`/`oneOf`/`properties`/`required`/`additionalProperties`/
 * `items`/`enum`/`const` plus annotations), so registration can validate them
 * without a schema library.
 *
 * The argument surface has no `page` (the tool always reads the first result
 * set) and names the result count `limit`, translated to the client's
 * `pageSize` option internally.
 */

import { SupportPresets, SupportProviders } from '@animegarden/client';

import { RESOURCE_TYPE_VALUES } from '../../shared/resource';

/** Name of the resource-search tool exposed to models (shared with the Client card). */
export { SEARCH_RESOURCES_TOOL_NAME } from '../../shared/tool';

/**
 * Model-facing tool description: purpose, returned shape, filter-combination
 * rules, and typical calls. Per-parameter rules live on the parameters.
 */
export const TOOL_DESCRIPTION: string = [
  'Search anime torrent resources aggregated from 動漫花園 (dmhy), 蜜柑计划 (mikan), 萌番组 (moe), and ANi through the public Anime Garden API (no authentication).',
  '',
  'Results are ordered newest first and rendered as a Markdown table listing the raw resource fields (title, provider:providerId, type, fansub/publisher, size, published time) plus source/detail/play/download links; the structured result also carries the resolved `filter` groups, `pagination`, and response `timestamp`.',
  '',
  'Filters from different groups combine with AND; values inside one group are OR unless the parameter says otherwise. Request field names mirror the public API, except pagination: the tool takes `limit` instead of page/pageSize. When nothing matches, relax the filters or raise `limit`.',
  '',
  'Typical calls:',
  '- Latest anime episodes: {"types":["动画"],"limit":10}',
  '- A specific title in 1080p: {"search":["葬送的芙莉莲"],"keywords":["1080p"]}',
  '- One fansub\'s recent releases: {"fansubs":["LoliHouse"],"after":"2026-01-01"}'
].join('\n');

/**
 * JSON Schema for the tool arguments (objects, arrays, and scalar enums only).
 *
 * The order groups related filters: title matching, source parties, resource
 * type, then time range and the result count.
 */
export const PARAMETERS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    search: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Full-text search terms (OR), usually an anime title such as ["葬送的芙莉莲"]. Takes precedence over `include`.'
    },
    include: {
      type: 'array',
      items: { type: 'string' },
      description: 'Title keywords to match (OR). Ignored when `search` is set.'
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required title keywords; the title must contain every value (AND).'
    },
    exclude: {
      type: 'array',
      items: { type: 'string' },
      description: 'Title keywords to reject; resources containing any value are excluded.'
    },
    fansubs: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Fansub/team names to match (OR). Discover names through https://api.animes.garden/teams.'
    },
    publishers: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Publisher/uploader names to match (OR). Discover names through https://api.animes.garden/users.'
    },
    types: {
      type: 'array',
      items: { type: 'string', enum: RESOURCE_TYPE_VALUES },
      description:
        'Resource categories to match (OR). Use ["动画"] for anime episodes and ["合集"] for batches; omit for all categories.'
    },
    subjects: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Bangumi subject ids to match (OR).'
    },
    preset: {
      type: 'string',
      enum: SupportPresets,
      description: 'Predefined filter preset. Omit for no preset.'
    },
    provider: {
      type: 'string',
      enum: SupportProviders,
      description:
        'Optional single source: dmhy (動漫花園), mikan (蜜柑计划), moe (萌番组), or ani (ANi). Leave it unset (the default) to search every source.'
    },
    after: {
      type: 'string',
      description:
        'Inclusive lower bound on publication time, as an ISO 8601 date/time or epoch milliseconds.'
    },
    before: {
      type: 'string',
      description:
        'Inclusive upper bound on publication time, as an ISO 8601 date/time or epoch milliseconds.'
    },
    limit: {
      type: 'integer',
      description: 'Maximum number of resources to return, clamped to 1..100. Default 30.'
    }
  }
};

/** Shape of the successful structured result handed to `output.render`. */
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['filter', 'pagination', 'timestamp', 'resources'],
  properties: {
    filter: {
      type: 'object',
      additionalProperties: false,
      description: 'Resolved filter groups applied by the public API (only present groups).',
      properties: {
        preset: { type: 'string' },
        provider: { type: 'string', description: 'dmhy, mikan, moe, or ani.' },
        types: { type: 'array', items: { type: 'string' } },
        after: { type: 'string', description: 'ISO 8601 lower bound.' },
        before: { type: 'string', description: 'ISO 8601 upper bound.' },
        fansubs: { type: 'array', items: { type: 'string' } },
        publishers: { type: 'array', items: { type: 'string' } },
        subjects: { type: 'array', items: { type: 'integer' } },
        search: { type: 'array', items: { type: 'string' } },
        include: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } }
      }
    },
    pagination: {
      type: 'object',
      additionalProperties: false,
      required: ['page', 'pageSize', 'complete'],
      description: 'Pagination metadata of the public API response.',
      properties: {
        page: { type: 'integer', description: 'Requested page (always 1).' },
        pageSize: { type: 'integer', description: 'Result count requested for the page.' },
        complete: {
          type: 'boolean',
          description: 'Whether no more results follow this page.'
        }
      }
    },
    timestamp: {
      type: 'string',
      description: 'Response timestamp reported by the public API (ISO 8601).'
    },
    resources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'provider',
          'providerId',
          'title',
          'href',
          'detailUrl',
          'type',
          'magnet',
          'keepshareUrl',
          'size',
          'sizeText',
          'fansub',
          'publisher',
          'createdAt'
        ],
        properties: {
          provider: {
            type: 'string',
            description: 'Source provider id: dmhy, mikan, moe, or ani.'
          },
          providerId: {
            type: 'string',
            description: 'Provider-local resource id (used in detail URLs).'
          },
          title: { type: 'string' },
          href: { type: 'string', description: 'Provider source page URL.' },
          detailUrl: {
            type: 'string',
            description: 'Generated AnimeGarden detail page URL.'
          },
          type: { type: 'string', description: 'Resource category such as 动画 or 合集.' },
          magnet: { type: 'string', description: 'Magnet download URI.' },
          keepshareUrl: {
            type: 'string',
            description: 'KeepShare playback URL, or an empty string.'
          },
          size: { type: 'integer', description: 'Resource size in bytes.' },
          sizeText: { type: 'string', description: 'Human-readable size such as "1.2 GB".' },
          fansub: { type: 'string', description: 'Fansub name, or an empty string when unknown.' },
          publisher: {
            type: 'string',
            description: 'Publisher name, or an empty string when unknown.'
          },
          createdAt: { type: 'string', description: 'Publication time (ISO 8601).' }
        }
      }
    }
  }
};
