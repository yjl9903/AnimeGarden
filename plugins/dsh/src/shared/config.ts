/**
 * Browser-behavior options shared by the Host row config and the Client half.
 *
 * The Host resolves the Loader row's `config` into these values and injects them
 * into the page as one global (see `host/config/`), because the Harness Client
 * half receives no Loader config of its own. Defaults preserve the plugin's
 * built-in behavior, so a missing or malformed value never disables a feature.
 */

/** Options that switch the plugin's browser behaviors. */
export interface PluginOptions {
  /** Open KeepShare playback links in the in-app floating player instead of a new tab. */
  embeddedPlayback: boolean;
  /** Hand magnet links to the OS default BitTorrent client; off copies the link instead. */
  openMagnet: boolean;
}

/** Defaults: every behavior this plugin shipped with. */
const DEFAULT_PLUGIN_OPTIONS: PluginOptions = {
  embeddedPlayback: true,
  openMagnet: true
};

/** Page global the Host index injection writes the options under. */
export const PLUGIN_OPTIONS_GLOBAL = '__ANIMEGARDEN_OPTIONS__';

/**
 * Read one boolean option, falling back to its default for any other type.
 * @param source - raw config object.
 * @param key - option name.
 * @returns the configured boolean, or the default.
 */
function readBooleanOption(source: Record<string, unknown>, key: keyof PluginOptions): boolean {
  const value = source[key];
  return typeof value === 'boolean' ? value : DEFAULT_PLUGIN_OPTIONS[key];
}

/**
 * Normalize an unknown config value (Loader `config` or injected global) into
 * complete options.
 * @param value - raw value from the Loader row or the page global.
 * @returns every option, with defaults for missing or mistyped entries.
 */
export function normalizePluginOptions(value: unknown): PluginOptions {
  const source: Record<string, unknown> =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    embeddedPlayback: readBooleanOption(source, 'embeddedPlayback'),
    openMagnet: readBooleanOption(source, 'openMagnet')
  };
}
