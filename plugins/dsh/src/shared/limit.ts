/**
 * Result-count (`limit`) rules shared by the Host tool and the Web panel.
 *
 * Call sites map `limit` to the client's `pageSize` option.
 */

/** Default result count when the bundle config does not override `limit`. */
export const DEFAULT_LIMIT = 30;

/** Upper bound for a requested `limit`. */
export const MAX_LIMIT = 100;

/** Clamp a requested result count into 1..100, falling back to the default. */
export function clampLimit(value: unknown, fallback: number = DEFAULT_LIMIT): number {
  const parsed = Number(value);
  const base = Number.isFinite(parsed) ? parsed : Number(fallback);
  if (!Number.isFinite(base)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.round(base)));
}
