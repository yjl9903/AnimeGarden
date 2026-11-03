/**
 * Document-level playback link routing.
 *
 * Playback links appear in two places the plugin cannot both own from one
 * component: the Anime Garden panel and any KeepShare link an agent writes into
 * the conversation (the search tool's results include one per resource). One
 * capture-phase click listener routes both into the floating player, while
 * modified clicks keep the browser's native "open in a new tab" behavior.
 */

import type { PlaybackTarget } from './store.js';

/** Attribute stamped on panel links so the window can show the resource title. */
export const PLAYBACK_TITLE_ATTRIBUTE = 'data-agp-playback-title';

/** Attribute marking links that must keep their native behavior (the window's own). */
export const PLAYBACK_IGNORE_ATTRIBUTE = 'data-agp-playback-ignore';

/** One routed click: the page to open plus whether the plugin rendered the link. */
export interface PlaybackClick {
  target: PlaybackTarget;
  /** Panel links keep bubbling so their own click analytics still runs. */
  ownLink: boolean;
}

/** KeepShare hosts whose pages the floating player embeds. */
function isKeepShareHost(hostname: string): boolean {
  return hostname === 'keepshare.cc' || hostname.endsWith('.keepshare.cc');
}

/**
 * Resolve a link target and report whether it is a KeepShare playback page.
 * @param href - raw anchor href, resolved against the current document.
 * @returns the absolute URL, or `null` for every other link.
 */
export function parsePlaybackHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.href);
    return url.protocol === 'https:' && isKeepShareHost(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Map one click to a playback target when it hits a KeepShare link.
 * @param event - the document click being routed.
 * @returns the target to open, or `null` to leave the click alone.
 */
/** Labels the search tool renders for its play column; they carry no title. */
const GENERIC_LABELS = new Set(['播放', 'play', 'watch', 'view']);

/**
 * Read the best available title for one playback anchor.
 *
 * The panel stamps the resource title on its links. Everywhere else the visible
 * text is the only label, and the tool's table renders it as just "播放"; that
 * generic label means "no title", so the window falls back to its localized
 * default instead of showing "播放" as the resource name.
 *
 * @param anchor - the anchor whose click was routed.
 * @returns the title, or an empty string when only a generic label is available.
 */
function playbackTitle(anchor: HTMLAnchorElement): string {
  const stamped = (anchor.getAttribute(PLAYBACK_TITLE_ATTRIBUTE) ?? '').trim();
  if (stamped !== '') return stamped;

  // Some renderers keep the destination's own title on the anchor.
  const attribute = (anchor.getAttribute('title') ?? '').trim();
  if (attribute !== '') return attribute;

  const text = (anchor.textContent ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[▶►\s]+/, '')
    .trim();
  return GENERIC_LABELS.has(text.toLowerCase()) ? '' : text;
}

/**
 * Map one click to a playback target when it hits a KeepShare link.
 * @param event - the document click being routed.
 * @returns the target to open, or `null` to leave the click alone.
 */
export function playbackClickFromEvent(event: MouseEvent): PlaybackClick | null {
  // Modified or non-primary clicks stay native: new tab, new window, bookmark.
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const node = event.target instanceof Element ? event.target : null;
  const anchor = node?.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.hasAttribute(PLAYBACK_IGNORE_ATTRIBUTE)) return null;

  const url = parsePlaybackHref(anchor.getAttribute('href') ?? '');
  if (url === null) return null;

  return {
    target: { url, title: playbackTitle(anchor) },
    ownLink: anchor.hasAttribute(PLAYBACK_TITLE_ATTRIBUTE)
  };
}

/**
 * Route every KeepShare click in the document into the floating player.
 * @param open - action that shows the target in the plugin's playback window.
 * @returns the disposer removing the listener when the plugin unloads.
 */
export function installPlaybackLinkInterceptor(open: (target: PlaybackTarget) => void): () => void {
  const onClick = (event: MouseEvent): void => {
    const click = playbackClickFromEvent(event);
    if (click === null) return;

    // Capture phase runs before the anchor's own handlers; preventing the default
    // navigation keeps the browser tab untouched. Foreign links also stop propagating
    // so a chat link handler cannot open the same page in the system browser as well.
    event.preventDefault();
    if (!click.ownLink) event.stopPropagation();
    open(click.target);
  };

  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
