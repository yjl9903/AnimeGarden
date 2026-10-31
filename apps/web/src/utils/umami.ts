import { z } from 'zod';

const optionalText = z
  .string()
  .optional()
  .transform((value) => value || undefined);
const errorPayload = z.object({ path: z.string(), error: z.string() });
const navPayload = z.object({ item: z.string() }).optional();

/**
 * The single source of truth for event names and their public analytics fields.
 * Object schemas strip unknown fields so prompts and clipboard contents cannot leak
 * through structurally compatible payloads. Event names are always written explicitly.
 */
const events = {
  download: z.object({ resource: z.string(), source: z.string() }),
  pikpak: z.object({ resource: z.string(), source: z.string() }),
  'feed.open': z.object({ href: z.string() }),
  'nav.click.home': navPayload,
  'nav.click.anime': z.object({ item: z.string(), group: z.string().optional() }).optional(),
  'nav.click.fansub': navPayload,
  'nav.click.type': navPayload,
  'theme.switch': z.object({ mode: z.enum(['light', 'dark', 'system']) }),
  'search.trigger': z.object({
    text: z.string(),
    source: z.enum(['button', 'command', 'history', 'result-more'])
  }),
  'search.history.click': z.object({ text: z.string() }),
  'search.history.delete': z.object({
    action: z.enum(['clear', 'remove']),
    text: optionalText,
    count: optionalText
  }),
  'search.suggestion.click': z.object({ text: z.string(), subjectId: z.string() }),
  'search.result.click': z.object({ text: z.string(), resource: z.string() }),
  'resources.detail.click': z.object({ resource: z.string(), type: z.string() }),
  'resources.filter.click': z.object({
    filterType: z.enum(['type', 'fansub', 'publisher']),
    value: z.string()
  }),
  'anime.calendar.click': z.object({
    subjectId: z.string(),
    title: z.string(),
    weekday: z.string()
  }),
  'subject.fallback-search': z.object({ subject: z.string() }),
  'collection.open-sidebar': z.undefined(),
  'collection.add': z.undefined(),
  'collection.open': z.object({ hash: z.string() }),
  'collection.share': z.object({ hash: z.string() }),
  'collection.open-resources': z.object({ search: z.string() }),
  'copy.feed': z.undefined(),
  'copy.magnet-links': z.undefined(),
  'copy.json': z.undefined(),
  'copy.fetch': z.object({ language: z.enum(['curl', 'javascript', 'python']) }),
  'copy.iframe': z.undefined(),
  'footer.link.click': z.object({ section: z.string(), label: z.string(), href: z.string() }),
  'skills.chat.open': z.object({
    app: z.string(),
    source: z.enum(['direct', 'example']),
    example: optionalText
  }),
  'skills.copy': z.object({
    kind: z.enum(['prompt', 'command', 'example']),
    source: z.string(),
    example: optionalText
  }),
  'error.render': errorPayload,
  'error.fetch-resources': errorPayload
};

/** Supported literal event names; no arbitrary strings or generated names. */
export type TrackEventName = keyof typeof events;

/** Infers the payload for an event, including required fields and literal unions. */
export type TrackPayload<Event extends TrackEventName> = z.infer<(typeof events)[Event]>;

/** Payload-free events have no keys; optional payloads still contribute all their fields. */
type TrackPayloadKeys<Event extends TrackEventName> =
  TrackPayload<Event> extends undefined ? never : keyof NonNullable<TrackPayload<Event>> & string;

/** HTML lowercases attribute names, so only events with entirely lowercase fields are eligible. */
export type TrackAttributeEventName = {
  [Name in TrackEventName]: Exclude<
    TrackPayloadKeys<Name>,
    Lowercase<TrackPayloadKeys<Name>>
  > extends never
    ? Name
    : never;
}[TrackEventName];

/** A union of tuples preserves the event/payload relationship even for union event names. */
type TrackArgs<Event extends TrackEventName = TrackEventName> = {
  [Name in Event]: undefined extends TrackPayload<Name>
    ? [eventName: Name, payload?: TrackPayload<Name>]
    : [eventName: Name, payload: TrackPayload<Name>];
}[Event];

/** Data attributes only: spreading these does not install or replace an onClick handler. */
type TrackAttributes<Event extends TrackEventName> = {
  'data-umami-event': Event;
} & {
  [Key in keyof NonNullable<TrackPayload<Event>> as `data-umami-event-${Key & string}`]?: string;
};

/** Applies the same field allowlist and optional-value handling to both tracking APIs. */
function getPayload(eventName: TrackEventName, payload: TrackPayload<TrackEventName>) {
  const parsed = events[eventName].parse(payload);
  if (parsed === undefined) return undefined;
  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}

/** Sends one event without letting an absent or failing tracker interrupt user actions. */
export function track(...[eventName, payload]: TrackArgs): void {
  try {
    // Rendering on the server and browsing with analytics blocked are both supported.
    if (typeof window === 'undefined') return;
    const umami = (
      window as Window & {
        umami?: { track: (eventName: string, payload?: Record<string, string>) => unknown };
      }
    ).umami;
    if (!umami) return;
    umami.track(eventName, getPayload(eventName, payload));
  } catch (error) {
    console.error(error);
  }
}

/** Builds declarative click attributes; events with mixed-case fields must use track instead. */
export function getTrackAttributes<Event extends TrackAttributeEventName>(
  ...[eventName, payload]: TrackArgs<TrackAttributeEventName> &
    [eventName: Event, payload?: TrackPayload<Event>]
): TrackAttributes<Event> {
  const attributes: Record<string, string> = { 'data-umami-event': eventName };
  for (const [key, value] of Object.entries(getPayload(eventName, payload) ?? {})) {
    attributes[`data-umami-event-${key}`] = value;
  }
  // Dynamic attribute keys cannot retain their mapped type through Object.entries.
  return attributes as TrackAttributes<Event>;
}
