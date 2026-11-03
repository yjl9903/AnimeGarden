/**
 * Icons owned by the floating playback window.
 *
 * Shared glyphs used by the panel as well (`LaunchIcon`, `RefreshIcon`) stay in
 * `../components/icons.tsx`; only the window-chrome controls live here.
 */

import type { IconProps } from '../components/icons.js';

import { getReact } from '../react.js';

/** X glyph for closing the floating playback window. */
export function CloseIcon({ size = 16 }: IconProps) {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Collapse glyph for minimizing the floating playback window to its title bar. */
export function MinimizeIcon({ size = 16 }: IconProps) {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

/** Expand glyph restoring the minimized playback title bar. */
export function RestoreIcon({ size = 16 }: IconProps) {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 14l6-6 6 6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Overflow glyph opening the playback window's secondary-actions menu. */
export function MoreIcon({ size = 16 }: IconProps) {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18.5" cy="12" r="1.6" />
    </svg>
  );
}
