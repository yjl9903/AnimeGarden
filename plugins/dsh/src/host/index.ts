/**
 * Host surface of the AnimeGarden DSH bundle.
 *
 * Each capability lives in its own `host/<feature>/` module (schema,
 * arguments, API access, rendering); this module owns their registration:
 *
 * - `resources/`: the `animegarden_search_resources` agent tool.
 *
 * Upcoming tools such as `animegarden_list_users`,
 * `animegarden_list_teams`, and a resource-detail tool plug in as additional
 * `register*` calls.
 */

import type { PluginToolContext, ResolvedOptions } from './shared/types';

import { registerSearchResourcesTool } from './resources';

/**
 * Register every Host capability of the bundle.
 *
 * @param ctx - Cordis plugin context (with `tools` injected).
 * @param options - resolved bundle config.
 * @returns the tool registry disposer.
 */
export function registerAnimeGardenTools(
  ctx: PluginToolContext,
  options: ResolvedOptions
): () => void {
  return registerSearchResourcesTool(ctx, options);
}
