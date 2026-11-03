/**
 * Calendar data layer for the Web panel.
 *
 * The public Bangumi calendar service (`https://bgm.animes.garden`) serves CORS
 * headers, so the panel fetches it directly. These helpers mirror the website's
 * season and weekday conventions.
 */

/** One season entry from `GET /calendars`. */
export interface CalendarSeasonInfo {
  season: string;
  is_active: boolean;
  count?: number;
  updated_at?: string;
}

/** Minimal Bangumi subject fields the calendar renders. */
export interface CalendarBangumi {
  name?: string;
  name_cn?: string;
  images?: {
    large?: string;
  } | null;
}

/** One calendar subject as returned by the calendar service. */
export interface CalendarSubject {
  id: number;
  title: string;
  bangumi: CalendarBangumi;
  poster?: string | null;
  onair_date?: string | null;
  alias?: Partial<Record<'ja' | 'zh' | 'en', string[]>>;
}

/** `GET /calendar?season=YYYY-MM` payload. */
export interface CalendarPayload {
  seasons: string[];
  calendar: CalendarSubject[][];
  web?: CalendarSubject[];
}

/** The calendar service JSON envelope. */
interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Bangumi calendar service base URL (CORS-enabled). */
const API_BASE = 'https://bgm.animes.garden';

/** Index of the upstream WEB bucket in the combined calendar list. */
export const WEB_WEEKDAY = 7;

/** Label shown for the WEB bucket (the website uses the literal `WEB`). */
export const WEB_LABEL = 'WEB';

/**
 * Calendar label used by the website and its analytics (`星期一`…`星期日`, `WEB`).
 * @param weekday - weekday index (0 = Monday), or {@link WEB_WEEKDAY}.
 * @returns the website's section label.
 */
export function calendarLabel(weekday: number): string {
  if (weekday === WEB_WEEKDAY) return WEB_LABEL;
  const names = ['一', '二', '三', '四', '五', '六', '日'];
  return `星期${names[weekday] ?? ''}`;
}

/** Localized weekday keys, index 0 = Monday. */
export const WEEKDAY_KEYS = [
  'weekday.mon',
  'weekday.tue',
  'weekday.wed',
  'weekday.thu',
  'weekday.fri',
  'weekday.sat',
  'weekday.sun'
] as const;

/**
 * Fetch and unwrap one calendar service response.
 * @param path - path below the calendar service base URL.
 * @param signal - aborts the request when React Query cancels it.
 * @returns the envelope's `data`.
 */
async function fetchData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (payload === null || typeof payload !== 'object') throw new Error('Invalid response');
  const envelope = payload as ApiEnvelope<T>;
  if (envelope.ok !== true || envelope.data === undefined) {
    throw new Error(envelope.error === undefined ? 'Invalid response' : envelope.error);
  }
  return envelope.data;
}

/** Fetch the season directory (`is_active` marks the current broadcast season). */
export function fetchCalendarSeasons(signal?: AbortSignal): Promise<CalendarSeasonInfo[]> {
  return fetchData<CalendarSeasonInfo[]>('/calendars', signal);
}

/** Fetch one season's seven weekday buckets plus the WEB bucket. */
export function fetchCalendar(season: string, signal?: AbortSignal): Promise<CalendarPayload> {
  return fetchData<CalendarPayload>(`/calendar?season=${encodeURIComponent(season)}`, signal);
}

/**
 * Pick the season to open: the active one, otherwise the newest entry.
 * @param seasons - the season directory from the calendar service.
 * @returns the season id, or undefined for an empty directory.
 */
export function pickActiveSeason(seasons: CalendarSeasonInfo[]): string | undefined {
  // Some deployments keep the previous season active while the next one is
  // already published, so pick the latest active season instead of the first.
  const sorted = [...seasons].sort((lhs, rhs) => rhs.season.localeCompare(lhs.season));
  const latestActive = sorted.find((entry) => entry.is_active);
  if (latestActive !== undefined) return latestActive.season;
  return sorted[0]?.season;
}

/** Hoisted Shanghai weekday formatter (rebuilding Intl formatters is expensive). */
const SHANGHAI_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  weekday: 'short'
});

/**
 * Current broadcast weekday using the website's rule: the Shanghai weekday of
 * "now minus six hours", with Monday = 0.
 * @param now - current time (injectable for tests).
 * @returns the weekday index in 0..6.
 */
export function currentWeekdayIndex(now: Date = new Date()): number {
  const shifted = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const short = SHANGHAI_WEEKDAY_FORMATTER.format(shifted);
  const index = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(short);
  return index === -1 ? 0 : index;
}

/**
 * Rotate the seven weekdays so the current broadcast day comes first.
 * @param current - the current weekday index in 0..6.
 * @returns seven weekday indexes in display order.
 */
export function rotatedWeekdays(current: number): number[] {
  return Array.from({ length: 7 }, (_, offset) => (current + offset) % 7);
}

/**
 * Display name shared with the website: Chinese alias, then Bangumi name, then title.
 * @param subject - one calendar subject.
 * @returns the display title.
 */
export function subjectDisplayName(subject: CalendarSubject): string {
  return subject.alias?.zh?.[0] || subject.bangumi.name_cn || subject.title;
}

/**
 * Poster URL through the Anime Garden Bangumi mirror; empty when the subject has no poster.
 * @param subject - one calendar subject.
 * @returns the poster URL or an empty string.
 */
export function subjectPosterURL(subject: CalendarSubject): string {
  const hasPoster = Boolean(subject.poster) || Boolean(subject.bangumi.images?.large);
  return hasPoster
    ? `https://bgm.animes.garden/bangumi/subject/${subject.id}/poster.jpeg?quality=large`
    : '';
}

/**
 * Subject page on the public website.
 * @param id - Bangumi subject id.
 * @returns the absolute subject URL.
 */
