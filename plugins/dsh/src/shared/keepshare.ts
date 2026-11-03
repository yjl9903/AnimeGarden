/**
 * KeepShare playback links shared by the Host tools and the Web panel.
 */

/** KeepShare playback prefix from the `animegarden` skill's output guidelines. */
export const KEEPSHARE_PREFIX = 'https://keepshare.cc/gv78k1oi/';

/**
 * Build the KeepShare playback URL from a magnet URI: the skill's rule appends
 * the part before the first `&` (the bare `magnet:?xt=...`), URI-encoded.
 *
 * @param magnet - resource magnet URI.
 * @returns KeepShare URL, or an empty string without a magnet.
 */
export function keepshareUrl(magnet: string): string {
  if (magnet.length === 0) return '';
  return `${KEEPSHARE_PREFIX}${encodeURIComponent(magnet.split('&')[0])}`;
}
