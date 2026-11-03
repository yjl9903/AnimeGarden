/**
 * Global magnet-link routing for the Web UI.
 *
 * Any `magnet:` anchor rendered in the Harness page — the Anime Garden panel's
 * download action and the chat result card's magnet button — is routed to the
 * Host's open-magnet route, which hands the URI to the OS default BitTorrent
 * client. One capture-phase document listener covers every surface, so the
 * behavior does not depend on which plugin or slot rendered the link.
 *
 * The Harness Markdown renderer only keeps `http:`/`https:`/`mailto:` anchors,
 * so model-written magnet links arrive here as plain text, not anchors; the
 * panel and other plugin views are the surfaces this interceptor can reach.
 */

import { toast } from 'sonner';

import type { ClientContext } from '../index.js';
import type { TranslateFunction } from '../i18n.js';

import { isMagnetUri, OPEN_MAGNET_PATH } from '../../shared/magnet';

/** Attribute stamped on plugin-rendered magnet links (keeps their click analytics). */
export const MAGNET_LINK_ATTRIBUTE = 'data-agp-magnet-link';

/** One open attempt: `ok` only when the Host reported a successful hand-off. */
export interface MagnetOpenResult {
  ok: boolean;
  /** Failure detail from the route or the network; empty on success. */
  message: string;
}

/** Narrow an unknown JSON body to a message-bearing record. */
function failureMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const message = (body as Record<string, unknown>).message;
  return typeof message === 'string' && message !== '' ? message : fallback;
}

/**
 * Ask the Host to open one magnet URI with the OS default application.
 *
 * @param magnet - validated magnet URI.
 * @returns the route's outcome; failures are reported instead of thrown.
 */
export async function openMagnet(magnet: string): Promise<MagnetOpenResult> {
  try {
    const response = await fetch(OPEN_MAGNET_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ magnet })
    });
    if (response.ok) return { ok: true, message: '' };

    let message = `HTTP ${String(response.status)}`;
    try {
      message = failureMessage(await response.json(), message);
    } catch {
      // A non-JSON failure body keeps the status text.
    }
    return { ok: false, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Route every magnet-anchor click in the document into the Host opener.
 *
 * Modified and non-primary clicks stay untouched so the panel's own
 * modifier-click copy behavior can run; the plugin's own anchors keep bubbling
 * for their click analytics, while foreign anchors stop propagating so no other
 * link handler also tries to open the same URI.
 *
 * @param open - action that hands one validated magnet URI to the Host.
 * @returns the disposer removing the listener when the plugin unloads.
 */
export function installMagnetLinkInterceptor(open: (magnet: string) => void): () => void {
  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const node = event.target instanceof Element ? event.target : null;
    const anchor = node?.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const magnet = anchor.getAttribute('href') ?? '';
    if (!isMagnetUri(magnet)) return;

    event.preventDefault();
    if (!anchor.hasAttribute(MAGNET_LINK_ATTRIBUTE)) event.stopPropagation();
    open(magnet);
  };

  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}

/**
 * Mount the global magnet-link routing on the Client context.
 *
 * @param ctx - Client plugin context owning the listener's lifetime.
 * @param t - translate seat bound to the plugin namespace.
 */
export function registerMagnetFeature(ctx: ClientContext, t: TranslateFunction): void {
  ctx.effect(
    () =>
      installMagnetLinkInterceptor((magnet) => {
        void openMagnet(magnet).then((result) => {
          if (!result.ok) toast.error(t('openMagnetFailed'));
        });
      }),
    'animegarden: magnet link interceptor'
  );
}
