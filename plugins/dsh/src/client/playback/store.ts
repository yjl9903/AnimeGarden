/**
 * Global playback window state.
 *
 * One store is created per plugin instance and shared by two consumers: the
 * `shell.overlay` window that embeds the KeepShare page, and the document-level
 * link interceptor. Opening a playback link anywhere in the Harness therefore
 * re-targets the same floating player instead of leaving the app.
 */

import { Store } from '@tanstack/store';

/** One KeepShare playback page shown in the floating window. */
export interface PlaybackTarget {
  /** Absolute KeepShare playback URL. */
  url: string;
  /** Resource title shown in the window header. */
  title: string;
}

/** Floating window rectangle in frame (viewport) coordinates. */
export interface PlaybackGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Interaction state owned by the playback store. */
export interface PlaybackState {
  /** Open playback page; `null` hides the window and unmounts the iframe. */
  target: PlaybackTarget | null;
  /** Last user-chosen rectangle; `null` until the user drags or resizes. */
  geometry: PlaybackGeometry | null;
  /** Collapsed to a title bar at the frame's bottom-right while the page keeps playing. */
  minimized: boolean;
  /** Last user-chosen title-bar position, kept across minimize/restore. */
  minimizedAt: Point | null;
  /** Bumped to remount the iframe for the header's reload action. */
  nonce: number;
}

/** A point in frame coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** Frame viewport used to keep the window fully on screen. */
export interface ViewportSize {
  width: number;
  height: number;
}

/** localStorage key holding the last user-chosen rectangle. */
const GEOMETRY_STORAGE_KEY = 'animegarden.playback.geometry';

/** Smallest width the floating player can shrink to. */
export const MIN_PLAYBACK_WIDTH = 360;

/** Smallest height the floating player can shrink to. */
export const MIN_PLAYBACK_HEIGHT = 240;

/** Height of the minimized title bar, matching the window header. */
export const MINIMIZED_HEIGHT = 40;

/** Gap kept between the floating player and the frame edges. */
const PLAYBACK_INSET = 8;

/** Minimum gap between the minimized title bar and the frame edges. */
const MINIMIZED_MARGIN = PLAYBACK_INSET * 2;

/** Read the current frame viewport. */
export function readViewportSize(): ViewportSize {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Keep a rectangle inside the viewport and above the minimum window size.
 * A viewport narrower than the minimum still yields a window that fits.
 * @param geometry - requested rectangle.
 * @param viewport - frame viewport size.
 * @returns the clamped rectangle.
 */
export function clampGeometry(
  geometry: PlaybackGeometry,
  viewport: ViewportSize
): PlaybackGeometry {
  const maxWidth = Math.max(240, viewport.width - PLAYBACK_INSET * 2);
  const maxHeight = Math.max(160, viewport.height - PLAYBACK_INSET * 2);
  const width = Math.min(Math.max(MIN_PLAYBACK_WIDTH, geometry.width), maxWidth);
  const height = Math.min(Math.max(MIN_PLAYBACK_HEIGHT, geometry.height), maxHeight);
  const x = Math.min(Math.max(PLAYBACK_INSET, geometry.x), viewport.width - width - PLAYBACK_INSET);
  const y = Math.min(
    Math.max(PLAYBACK_INSET, geometry.y),
    viewport.height - height - PLAYBACK_INSET
  );
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

/**
 * First-open rectangle: a large centered window biased slightly above center so
 * its header stays clear of the host's bottom chrome.
 * @param viewport - frame viewport size.
 * @returns the clamped default rectangle.
 */
export function defaultGeometry(viewport: ViewportSize): PlaybackGeometry {
  const width = Math.round(Math.min(1080, Math.max(560, viewport.width * 0.62)));
  const height = Math.round(Math.min(760, Math.max(420, viewport.height * 0.72)));
  return clampGeometry(
    {
      x: (viewport.width - width) / 2,
      y: Math.max(PLAYBACK_INSET, (viewport.height - height) / 2 - 24),
      width,
      height
    },
    viewport
  );
}

/**
 * Minimized title-bar rectangle: a compact bar at the frame's bottom-right that
 * keeps the iframe mounted (and playing) while it is visually collapsed.
 * @param viewport - frame viewport size.
 * @param at - last user-chosen bar position, or `null` for the default corner.
 * @returns the clamped bar rectangle.
 */
export function minimizedGeometry(viewport: ViewportSize, at: Point | null): PlaybackGeometry {
  const maxWidth = Math.max(200, viewport.width - MINIMIZED_MARGIN * 2);
  const width = Math.round(Math.min(380, Math.max(260, viewport.width * 0.28), maxWidth));
  const height = MINIMIZED_HEIGHT;
  const maxX = Math.max(MINIMIZED_MARGIN, viewport.width - width - MINIMIZED_MARGIN);
  const maxY = Math.max(MINIMIZED_MARGIN, viewport.height - height - MINIMIZED_MARGIN);
  const x = at === null ? maxX : Math.min(Math.max(MINIMIZED_MARGIN, at.x), maxX);
  const y = at === null ? maxY : Math.min(Math.max(MINIMIZED_MARGIN, at.y), maxY);
  return { x: Math.round(x), y: Math.round(y), width, height };
}

/** Compass name of the corner a resize handle sits on. */
export type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se';

/**
 * Apply one corner-resize gesture, anchoring the opposite corner.
 *
 * Each axis is clamped to the minimum window size and to the inset viewport edge,
 * so a window dragged toward an edge keeps its anchored edges still instead of
 * shrinking below the minimum or leaving the frame.
 *
 * @param origin - rectangle captured on pointer-down.
 * @param direction - corner being dragged.
 * @param dx - horizontal pointer movement since pointer-down.
 * @param dy - vertical pointer movement since pointer-down.
 * @param viewport - frame viewport size.
 * @returns the clamped rectangle.
 */
export function resizeGeometry(
  origin: PlaybackGeometry,
  direction: ResizeDirection,
  dx: number,
  dy: number,
  viewport: ViewportSize
): PlaybackGeometry {
  const west = direction === 'nw' || direction === 'sw';
  const north = direction === 'nw' || direction === 'ne';

  let width: number;
  let x: number;
  if (west) {
    // The right edge stays put; the left edge may travel to the viewport inset.
    const maxWidth = Math.max(MIN_PLAYBACK_WIDTH, origin.x + origin.width - PLAYBACK_INSET);
    width = Math.min(Math.max(MIN_PLAYBACK_WIDTH, origin.width - dx), maxWidth);
    x = origin.x + origin.width - width;
  } else {
    const maxWidth = Math.max(MIN_PLAYBACK_WIDTH, viewport.width - origin.x - PLAYBACK_INSET);
    width = Math.min(Math.max(MIN_PLAYBACK_WIDTH, origin.width + dx), maxWidth);
    x = origin.x;
  }

  let height: number;
  let y: number;
  if (north) {
    // The bottom edge stays put; the top edge may travel to the viewport inset.
    const maxHeight = Math.max(MIN_PLAYBACK_HEIGHT, origin.y + origin.height - PLAYBACK_INSET);
    height = Math.min(Math.max(MIN_PLAYBACK_HEIGHT, origin.height - dy), maxHeight);
    y = origin.y + origin.height - height;
  } else {
    const maxHeight = Math.max(MIN_PLAYBACK_HEIGHT, viewport.height - origin.y - PLAYBACK_INSET);
    height = Math.min(Math.max(MIN_PLAYBACK_HEIGHT, origin.height + dy), maxHeight);
    y = origin.y;
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

/** Read the persisted rectangle; storage failures (private mode) degrade to `null`. */
function loadGeometry(): PlaybackGeometry | null {
  try {
    const raw = window.localStorage.getItem(GEOMETRY_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    const fields = ['x', 'y', 'width', 'height'] as const;
    // Ignore stale or hand-edited payloads instead of rendering a broken window.
    if (!fields.every((field) => typeof value[field] === 'number')) return null;
    return {
      x: value.x as number,
      y: value.y as number,
      width: value.width as number,
      height: value.height as number
    };
  } catch {
    return null;
  }
}

/** Persist the rectangle; storage failures are not user-visible. */
function saveGeometry(geometry: PlaybackGeometry): void {
  try {
    window.localStorage.setItem(GEOMETRY_STORAGE_KEY, JSON.stringify(geometry));
  } catch {
    // A full or blocked localStorage must not break closing the window.
  }
}

/**
 * Create the playback store shared by the overlay window and link interceptor.
 * @returns the store plus the actions that move the open page and its rectangle.
 */
export function createPlaybackStore() {
  const store = new Store<PlaybackState>({
    target: null,
    geometry: loadGeometry(),
    minimized: false,
    minimizedAt: null,
    nonce: 0
  });

  return {
    store,

    /** Show one playback page, replacing whatever the window currently holds. */
    open(target: PlaybackTarget): void {
      // A new link always reveals the player, even when the last one was minimized.
      store.setState((state) => ({
        ...state,
        target,
        minimized: false,
        nonce: state.nonce + 1
      }));
    },

    /** Close the window; unmounting the iframe also stops playback. */
    close(): void {
      store.setState((state) => ({ ...state, target: null, minimized: false }));
    },

    /** Collapse to the title bar while the iframe keeps playing. */
    minimize(): void {
      store.setState((state) => ({ ...state, minimized: true }));
    },

    /** Expand back to the last floating rectangle. */
    restore(): void {
      store.setState((state) => ({ ...state, minimized: false }));
    },

    /** Remount the iframe with the same URL, matching a browser reload. */
    reload(): void {
      store.setState((state) => ({ ...state, target: state.target, nonce: state.nonce + 1 }));
    },

    /** Remember a user-chosen rectangle so the next open restores the placement. */
    commitGeometry(geometry: PlaybackGeometry): void {
      const clamped = clampGeometry(geometry, readViewportSize());
      store.setState((state) => ({ ...state, geometry: clamped }));
      saveGeometry(clamped);
    },

    /** Remember where the user dragged the minimized title bar. */
    commitMinimizedAt(point: Point): void {
      const bar = minimizedGeometry(readViewportSize(), point);
      store.setState((state) => ({ ...state, minimizedAt: { x: bar.x, y: bar.y } }));
    }
  };
}

/** The playback store plus its actions. */
export type PlaybackStore = ReturnType<typeof createPlaybackStore>;
