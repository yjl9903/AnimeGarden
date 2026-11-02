import { expectTypeOf } from 'vitest';

import {
  getTrackAttributes,
  track,
  type TrackAttributeEventName,
  type TrackEventName,
  type TrackPayload
} from '../src/utils/umami';

// These calls are checked by tsc, not executed as runtime tests.
track('copy.feed');
track('nav.click.anime');
track('nav.click.anime', { item: '动画', group: '周一' });
track('copy.fetch', { language: 'curl' });
getTrackAttributes('copy.feed');
getTrackAttributes('nav.click.anime', { item: '动画', group: '周一' });
getTrackAttributes('skills.copy', { kind: 'prompt', source: 'hero' });

expectTypeOf<TrackPayload<'copy.fetch'>>().toEqualTypeOf<{
  language: 'curl' | 'javascript' | 'python';
}>();
expectTypeOf<TrackPayload<'skills.copy'>>().toEqualTypeOf<{
  kind: 'prompt' | 'command' | 'example';
  source: string;
  example?: string;
}>();

const attributes = getTrackAttributes('pikpak', { resource: 'dmhy:123', source: 'play' });
expectTypeOf(attributes['data-umami-event']).toEqualTypeOf<'pikpak'>();
expectTypeOf(attributes['data-umami-event-resource']).toEqualTypeOf<string | undefined>();
// @ts-expect-error Only this event's payload keys become attributes.
attributes['data-umami-event-language'];

// @ts-expect-error Unknown event names are not accepted.
track('unknown.event');
// @ts-expect-error Required payload cannot be omitted.
track('copy.fetch');
// @ts-expect-error Required payload cannot be undefined.
track('copy.fetch', undefined);
// @ts-expect-error Payload-free events do not accept objects.
track('copy.feed', {});
// @ts-expect-error Literal payload values are inferred from the event.
track('copy.fetch', { language: 'ruby' });
// @ts-expect-error Required fields are checked.
track('skills.copy', { source: 'hero' });
// @ts-expect-error Unknown fields must not be sent.
track('skills.copy', { kind: 'prompt', source: 'hero', text: 'private content' });
// @ts-expect-error The nav payload is optional, but item is required when supplied.
track('nav.click.anime', { group: '周一' });

// @ts-expect-error Attributes use the same event-name constraints.
getTrackAttributes('unknown.event');
// @ts-expect-error Attributes require required payloads.
getTrackAttributes('pikpak');
// @ts-expect-error Attributes reject payloads for payload-free events.
getTrackAttributes('copy.feed', {});
// @ts-expect-error Attributes check literal payload values.
getTrackAttributes('copy.fetch', { language: 'ruby' });
// @ts-expect-error Attributes reject missing required fields.
getTrackAttributes('skills.copy', { source: 'hero' });
// @ts-expect-error Attributes reject unknown fields.
getTrackAttributes('skills.copy', { kind: 'prompt', source: 'hero', text: 'private content' });

declare const event: 'copy.feed' | 'copy.fetch';
// @ts-expect-error An un-narrowed union might require a payload.
track(event);
// @ts-expect-error An un-narrowed union might not accept this payload.
track(event, { language: 'curl' });
// @ts-expect-error Attributes also preserve event/payload correlation.
getTrackAttributes(event, { language: 'curl' });

// The eligible set is derived from schema fields, not a manually maintained event list.
expectTypeOf<TrackAttributeEventName>().toEqualTypeOf<
  Exclude<
    TrackEventName,
    | 'search.suggestion.click'
    | 'resources.filter.click'
    | 'anime.calendar.click'
    | 'anime.season.change'
  >
>();

// These existing payload names remain supported by direct tracking.
track('search.suggestion.click', { text: 'Example', subjectId: '123' });
track('resources.filter.click', { filterType: 'type', value: '动画' });
track('anime.calendar.click', { subjectId: '123', title: 'Example', weekday: 'Monday' });
track('anime.season.change', { fromSeason: '2026-07', toSeason: '2026-10', source: 'season' });
track('resources.load-more.click', { path: '/', search: '', kind: 'link' });
getTrackAttributes('home.calendar.click', { season: '2026-10', source: 'title' });

// @ts-expect-error Scroll loading is not a click event.
track('resources.load-more.click', { path: '/', search: '', kind: 'scroll' });
// @ts-expect-error HTML would lowercase the season field names.
getTrackAttributes('anime.season.change', {
  fromSeason: '2026-07',
  toSeason: '2026-10',
  source: 'year'
});

// @ts-expect-error HTML would change subjectId to subjectid.
getTrackAttributes('search.suggestion.click', { text: 'Example', subjectId: '123' });
// @ts-expect-error HTML would change filterType to filtertype.
getTrackAttributes('resources.filter.click', { filterType: 'type', value: '动画' });
// @ts-expect-error Calendar events also have a mixed-case field.
getTrackAttributes('anime.calendar.click', {
  subjectId: '123',
  title: 'Example',
  weekday: 'Monday'
});
// @ts-expect-error Explicitly widening the generic must not bypass the restriction.
getTrackAttributes<TrackEventName>('resources.filter.click', { filterType: 'type', value: '动画' });

declare const mixedCaseEvent: 'pikpak' | 'search.suggestion.click';
// @ts-expect-error A union containing an ineligible event must be narrowed first.
getTrackAttributes(mixedCaseEvent, { resource: 'dmhy:123', source: 'play' });
