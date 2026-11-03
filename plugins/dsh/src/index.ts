/**
 * Host half of the AnimeGarden DSH bundle (entry module).
 *
 * Registers the bundle's Host surface: the `animegarden_search_resources` agent
 * tool (queries the public AnimeGarden API at https://api.animes.garden, no
 * authentication, and returns a Markdown table with a KeepShare playback link
 * and a magnet download link per resource) and the same-origin
 *
 * This entry only exports the Cordis plugin shape; the implementation lives in
 * `./host/`, where each capability keeps its schema, argument mapping, API
 * access, and rendering in its own small module. The plugin is TypeScript with
 * only workspace-internal library dependencies and runs in the DSH Host process
 * (Node.js 24+, built-in `fetch`).
 */

import type { PluginToolContext } from './host/shared/types';

import { registerAnimeGardenTools } from './host';
import { resolveOptions } from './host/shared/options';

/** Cordis plugin name used by Loader diagnostics. */
export const name = 'animegarden';

/** Host services this plugin needs: the tool registry and the web server. */
export const inject = ['tools'];

/**
 * Register the bundle's Host surface.
 *
 * @param ctx - Cordis plugin context (with `tools` injected).
 * @param config - Loader row config (`apiBase`, `limit`).
 */
export function apply(ctx: PluginToolContext, config: unknown): void {
  const options = resolveOptions(config);
  registerAnimeGardenTools(ctx, options);
}
