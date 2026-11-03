/**
 * Host surface of the AnimeGarden DSH bundle.
 *
 * Each capability lives in its own `host/<feature>/` module (schema,
 * arguments, API access, rendering); this module owns their registration:
 *
 * - `resources/`: the `animegarden_search_resources` agent tool.
 * - `config/`: the browser options index injection.
 * - `magnet/`: the same-origin route that hands a magnet URI to the OS
 *   default BitTorrent client (browser profiles only).
 *
 * Upcoming tools such as `animegarden_list_users`,
 * `animegarden_list_teams`, and a resource-detail tool plug in as additional
 * `register*` calls.
 */

import type { PluginToolContext, ResolvedOptions } from './shared/types';

import { registerOpenMagnetRoute } from './magnet';
import { registerOptionsInjection } from './config';
import { registerSearchResourcesTool } from './resources';

/**
 * Register every Host capability of the bundle.
 *
 * The web-facing capabilities go through optional injection: they need the web
 * server, the connection trust fence, and the subprocess service, so a
 * CLI/headless profile keeps the search tool without them. The options
 * injection always runs there (the Client needs the flags even when the magnet
 * route is disabled); the magnet route itself only exists when `openMagnet`
 * is enabled.
 *
 * @param ctx - Cordis plugin context (with `tools` injected).
 * @param options - resolved bundle config.
 * @returns the tool registry disposer.
 */
export function registerAnimeGardenTools(
  ctx: PluginToolContext,
  options: ResolvedOptions
): () => void {
  const disposer = registerSearchResourcesTool(ctx, options);

  ctx.inject?.(['webServer', 'connection', 'subprocess'], (web) => {
    registerOptionsInjection(web, options);
    if (options.openMagnet) registerOpenMagnetRoute(web);
  });

  return disposer;
}
