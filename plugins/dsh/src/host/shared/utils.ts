/**
 * Small, tool-agnostic helpers shared by the Host tools.
 *
 * Argument normalization for list-style tools lives here so every future tool
 * (resources, users, teams, detail) applies the same rules for arrays,
 * timestamps, and the API base URL. Result-count rules live in `src/shared/`.
 */

/** Narrow an arbitrary model-supplied value to a plain arguments record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalize a model-supplied filter value into a deduplicated string array.
 * Accepts a single string for convenience even when the schema declares an array.
 *
 * @param value - raw argument value.
 * @returns trimmed, non-empty, unique values.
 */
export function toArray(value: unknown): string[] {
  const values: unknown[] = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of values) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/**
 * Convert a time filter into epoch milliseconds.
 *
 * @param value - ISO 8601 date/time or epoch milliseconds.
 * @param name - argument name used in error messages.
 * @returns millisecond timestamp, or undefined when unset.
 */
export function toTimestamp(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Invalid "${name}" value: expected an ISO 8601 date/time or epoch milliseconds.`
    );
  }
  const text = value.trim();
  if (/^-?\d+$/.test(text)) return Number(text);
  const time = Date.parse(text);
  if (Number.isNaN(time)) {
    throw new Error(
      `Invalid "${name}" value "${text}": expected an ISO 8601 date/time or epoch milliseconds.`
    );
  }
  return time;
}

/** Sort values like the reference client so request URLs are stable and cache friendly. */
export function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

/** The client resolves `resources?...` style paths against this base URL, so it needs a trailing slash. */
export function toBaseURL(baseURL: string): string {
  return baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
}
