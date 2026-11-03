/**
 * Umami analytics for the Web panel.
 *
 * The website loads the Umami script and calls `window.umami.track(...)`, which a
 * plugin cannot do (no script injection, no global tracker). This module posts the
 * same collect payload the script sends to `/api/send`, so the same website id and
 * the same dashboards keep working.
 *
 * Event names and field names mirror `apps/web/src/utils/umami.ts` exactly.
 */

const UMAMI_ENDPOINT = 'https://umami.animes.garden/api/send';

/** Public website id used by https://animes.garden. */
const UMAMI_WEBSITE = 'bcff225d-6590-498e-9b39-3a5fc5c2b4d1';

/** Keep DSH-plugin traffic attributable to the public website host. */
const UMAMI_HOSTNAME = 'animes.garden';

/** Stable synthetic page URL for the panel (there is no real web route). */
const PANEL_URL = 'https://animes.garden/_/dsh-plugin';

/** Umami `tag` attached to every payload, marking DeepSeek Harness plugin traffic. */
const SOURCE_TAG = 'dsh-plugin';

/** Event payloads mirrored from the website's Umami schema. */
export interface TrackEventMap {
  'search.trigger': {
    text: string;
    source: 'button' | 'command' | 'history' | 'result-more';
  };
  pikpak: { resource: string; source: string };
  download: { resource: string; source: string };
  'resources.detail.click': { resource: string; type: string };
  'resources.filter.click': {
    filterType: 'type' | 'fansub' | 'publisher';
    value: string;
  };
  'anime.calendar.click': { subjectId: string; title: string; weekday: string };
  'error.fetch-resources': { path: string; error: string };
}

/** Literal event names supported by {@link track}. */
export type TrackEventName = keyof TrackEventMap;

/** Common Umami fields the collect endpoint expects alongside the event. */
function basePayload(title = ''): Record<string, string> {
  const screen =
    typeof window.screen === 'undefined' ? '' : `${window.screen.width}x${window.screen.height}`;

  return {
    website: UMAMI_WEBSITE,
    screen,
    language: typeof navigator === 'undefined' ? '' : navigator.language,
    title: title || (typeof document === 'undefined' ? '' : document.title),
    hostname: UMAMI_HOSTNAME,
    url: PANEL_URL,
    referrer: '',
    tag: SOURCE_TAG
  };
}

/** POST one collect payload, silently ignoring network/CORS failures. */
function send(body: { type: 'event' | 'pageview'; payload: Record<string, unknown> }): void {
  try {
    if (typeof window === 'undefined') return;
    void fetch(UMAMI_ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'x-umami-website-id': UMAMI_WEBSITE,
        'x-umami-hostname': UMAMI_HOSTNAME
      },
      body: JSON.stringify(body)
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the panel.
  }
}

/**
 * Send one Umami event without ever interrupting the user action that triggered it.
 * @param name - event name, identical to the website's analytics event.
 * @param payload - event fields, identical to the website's payload schema.
 */
export function track<E extends TrackEventName>(name: E, payload: TrackEventMap[E]): void {
  send({ type: 'event', payload: { ...basePayload(), name, data: payload } });
}

/**
 * Report one panel pageview.
 *
 * This Umami deployment records pageviews as a nameless `event` (its tracker sends
 * `G()` → `{...payload}` with `type: 'event'`); `/api/send` rejects `pageview` as a
 * type, so the PV is sent the same way the website's tracker does.
 */
export function trackPageview(): void {
  send({ type: 'event', payload: basePayload('Anime Garden') });
}
