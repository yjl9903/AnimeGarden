/**
 * The magnet-link opening contract shared by the Host route and the Web UI.
 *
 * Starting a desktop BitTorrent client is Host work: page JavaScript cannot
 * launch a process, and the DSH shell blocks `magnet:` navigation. The browser
 * half therefore only knows one same-origin route and the shape of a magnet URI
 * it is allowed to submit; both sides read the same constants and validator
 * here instead of duplicating them.
 */

/** Same-origin route that hands one magnet URI to the OS default client. */
export const OPEN_MAGNET_PATH = '/plugins/dsh-plugin-animegarden/open-magnet';

/** Longest magnet URI accepted; Anime Garden links stay far below this bound. */
export const MAX_MAGNET_LENGTH = 4096;

/**
 * Whether `value` is a BitTorrent magnet URI this plugin may hand to the OS.
 *
 * The check is deliberately strict because the Host turns the value into an OS
 * launch: only the `xt=urn:btih:` / `xt=urn:btmh:` infohash forms Anime Garden
 * publishes are accepted, so a foreign `xt` scheme or a malformed link is
 * rejected before any process is spawned.
 *
 * @param value - raw URI from an anchor `href` or the request body.
 * @returns true when the value is an acceptable magnet URI.
 */
export function isMagnetUri(value: string): boolean {
  if (value.length < 'magnet:?xt=urn:btih:'.length || value.length > MAX_MAGNET_LENGTH) {
    return false;
  }
  if (!value.startsWith('magnet:?')) return false;

  // Match `xt=urn:btih:` at the start or after another query parameter.
  return /(?:^|&)xt=urn:bt(?:ih|mh):[a-z0-9]+/i.test(value.slice('magnet:?'.length));
}
