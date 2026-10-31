/** Internal resource version and optional keyset position. Timestamps are Unix milliseconds. */
export interface ResourceCursor {
  anchor: number;
  position?: {
    createdAt: number;
    id: number;
  };
}

const CURSOR_VERSION = 1;

function isTimestamp(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

/** Encodes the same version/position identically in browsers and Node, without Buffer. */
export function encodeResourcesCursor(cursor: ResourceCursor): string {
  const { anchor, position } = cursor;
  if (
    !isTimestamp(anchor) ||
    (position !== undefined &&
      (!isTimestamp(position.createdAt) || !Number.isSafeInteger(position.id) || position.id <= 0))
  ) {
    throw new Error('Invalid resource cursor.');
  }

  // Numeric JSON is ASCII, so btoa/atob need no UTF-8 adapter.
  const payload = position
    ? [CURSOR_VERSION, anchor, position.createdAt, position.id]
    : [CURSOR_VERSION, anchor];

  return btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** Validates the internal wire format, including canonical JSON/base64url representation. */
export function decodeResourcesCursor(token: string): ResourceCursor {
  try {
    if (!token || token.length > 256 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error();
    const payload: unknown = JSON.parse(atob(token.replaceAll('-', '+').replaceAll('_', '/')));
    if (
      !Array.isArray(payload) ||
      ![2, 4].includes(payload.length) ||
      payload[0] !== CURSOR_VERSION
    ) {
      throw new Error();
    }
    const [, anchor, createdAt, id] = payload as unknown[];
    if (!isTimestamp(anchor)) throw new Error();
    const cursor: ResourceCursor = { anchor };
    if (payload.length === 4) {
      if (
        !isTimestamp(createdAt) ||
        typeof id !== 'number' ||
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {
        throw new Error();
      }
      cursor.position = { createdAt, id };
    }
    if (encodeResourcesCursor(cursor) !== token) throw new Error();
    return cursor;
  } catch {
    throw new Error('Invalid resource cursor.');
  }
}
