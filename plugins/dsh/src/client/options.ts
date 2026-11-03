/**
 * Browser-side plugin options.
 *
 * The Host injects the resolved options as one page global before the app boots
 * (see `host/config/`), so every Client capability can gate itself
 * synchronously during activation instead of waiting on a request. A missing
 * global (older Host, static build without injections) keeps the defaults.
 */

import type { PluginOptions } from '../shared/config';

import { normalizePluginOptions, PLUGIN_OPTIONS_GLOBAL } from '../shared/config';

/**
 * Read the plugin's browser options.
 *
 * The Host writes the page global before the app boots, so it never changes for
 * one page lifetime; re-reading it is cheap and keeps no module state.
 *
 * @returns every option, with defaults for a missing or malformed global.
 */
export function getPluginOptions(): PluginOptions {
  const injected: unknown = (globalThis as Record<string, unknown>)[PLUGIN_OPTIONS_GLOBAL];
  return normalizePluginOptions(injected);
}
