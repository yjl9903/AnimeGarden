/**
 * The `animegarden_search_resources` tool: execution and registration.
 *
 * `executeSearchResources` maps the arguments, calls the public API through
 * `@animegarden/client`, and normalizes the result into the declared output
 * shape. `registerSearchResourcesTool` publishes that definition on the Host
 * tool registry; the registry records a scope effect on the plugin context, so
 * the tool is unregistered automatically when the plugin is unloaded or reloaded.
 */

import type {
  PluginToolContext,
  ResolvedOptions,
  ToolDefinition,
  ToolRunContext
} from '../shared/types';

import { isRecord } from '../shared/utils';
import { REQUEST_TIMEOUT_MS } from '../shared/constants';

import type { SearchResult } from './types';

import { renderMarkdown } from './render';
import { buildFetchOptions } from './args';
import { mapFilter, mapResource, searchResources } from './api';
import {
  OUTPUT_SCHEMA,
  PARAMETERS_SCHEMA,
  SEARCH_RESOURCES_TOOL_NAME,
  TOOL_DESCRIPTION
} from './schema';

/**
 * Execute one `animegarden_search_resources` call: map the arguments onto client
 * options, run the search through `@animegarden/client`, and normalize the
 * result into the declared output shape.
 *
 * @param options - resolved bundle config.
 * @param rawArgs - model-supplied arguments.
 * @param exec - tool run context.
 * @returns structured result matching `OUTPUT_SCHEMA`.
 */
export async function executeSearchResources(
  options: ResolvedOptions,
  rawArgs: unknown,
  exec: ToolRunContext | undefined
): Promise<SearchResult> {
  const args = isRecord(rawArgs) ? rawArgs : {};
  const request = buildFetchOptions(options, args);
  const result = await searchResources(options, request, exec?.signal);

  return {
    filter: mapFilter(result.filter),
    pagination: result.pagination,
    timestamp: result.timestamp.toISOString(),
    resources: result.resources.map(mapResource)
  };
}

/**
 * Register the `animegarden_search_resources` tool on the Host tool registry.
 *
 * @param ctx - Cordis plugin context (with `tools` injected).
 * @param options - resolved bundle config.
 * @returns the registry's disposer (registration is already effect-scoped).
 */
export function registerSearchResourcesTool(
  ctx: PluginToolContext,
  options: ResolvedOptions
): () => void {
  const definition: ToolDefinition<SearchResult> = {
    name: SEARCH_RESOURCES_TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: PARAMETERS_SCHEMA,
    output: { schema: OUTPUT_SCHEMA, render: renderMarkdown },
    // Backstop for the harness timeout policy; `searchResources` enforces the
    // tighter 15 s budget cooperatively so a slow API yields a readable error.
    timeoutMs: REQUEST_TIMEOUT_MS + 5_000,
    isConcurrencySafe: () => true,
    execute: (args, exec) => executeSearchResources(options, args, exec)
  };

  return ctx.tools.register(definition);
}
