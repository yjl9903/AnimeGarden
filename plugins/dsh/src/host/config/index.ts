/**
 * Delivers the plugin's browser options to the Harness page.
 *
 * The Client half gets no Loader row config, so the Host contributes one
 * `global` index injection: the web server renders it before the app boots, and
 * `src/client/options.ts` reads the same global while the Client plugin
 * activates. The row is re-read on every index render, so a reload picks up
 * config changes without any client-side fetch.
 */

import type { PluginOptions } from '../../shared/config';

import { normalizePluginOptions, PLUGIN_OPTIONS_GLOBAL } from '../../shared/config';

import type { HostWebContext } from '../shared/types';

/**
 * Register the options index injection.
 *
 * @param ctx - Host context with the web-server event (browser profiles only).
 * @param options - resolved browser options from the Loader row config.
 */
export function registerOptionsInjection(ctx: HostWebContext, options: PluginOptions): void {
  ctx.effect(
    () =>
      ctx.on('webserver/index-inject', (table) => {
        // Project only the browser options: the API endpoint is Host-only.
        table.push({
          kind: 'global',
          name: PLUGIN_OPTIONS_GLOBAL,
          value: normalizePluginOptions(options)
        });
      }),
    'animegarden: option injection'
  );
}
