import { getReact } from '../react.js';

/** Size prop shared by the inline Carbon/Lucide glyphs. */
export interface IconProps {
  size?: number;
}

/** Carbon `play` glyph for the KeepShare playback action. */
export function PlayIcon({ size = 18 }: IconProps) {
  // Classic JSX emits React.createElement, so the loader-provided runtime must be in scope.
  const React = getReact();
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M7 28a1 1 0 0 1-1-1V5a1 1 0 0 1 1.482-.876l20 11a1 1 0 0 1 0 1.752l-20 11A1 1 0 0 1 7 28M8 6.69v18.62L24.925 16Z"
      />
    </svg>
  );
}

/** Carbon `download` glyph for the magnet download action. */
export function DownloadIcon({ size = 18 }: IconProps) {
  const React = getReact();
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4Zm0-10l-1.41-1.41L17 20.17V2h-2v18.17l-7.59-7.58L6 14l10 10z"
      />
    </svg>
  );
}

/** Carbon `error` glyph used when a load-more request fails. */
export function ErrorIcon({ size = 16 }: IconProps) {
  const React = getReact();
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M2 16A14 14 0 1 0 16 2A14 14 0 0 0 2 16m23.15 7.75L8.25 6.85a12 12 0 0 1 16.9 16.9M8.24 25.16a12 12 0 0 1-1.4-16.89l16.89 16.89a12 12 0 0 1-15.49 0"
      />
    </svg>
  );
}

/** Carbon `launch` glyph for the second-line detail link. */
export function LaunchIcon({ size = 14 }: IconProps) {
  const React = getReact();
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M26 28H6a2.003 2.003 0 0 1-2-2V6a2.003 2.003 0 0 1 2-2h10v2H6v20h20V16h2v10a2.003 2.003 0 0 1-2 2"
      />
      <path fill="currentColor" d="M20 2v2h6.586L18 12.586L19.414 14L28 5.414V12h2V2z" />
    </svg>
  );
}

/** Chevron-down glyph used by the dropdown triggers. */
export function ChevronIcon() {
  const React = getReact();
  return (
    <svg
      className="agp-chevron"
      viewBox="0 0 16 16"
      width={12}
      height={12}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Chevron-left glyph for the history back control. */
export function ChevronLeftIcon() {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Chevron-right glyph for the history forward control. */
export function ChevronRightIcon() {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Rotate-cw glyph for the refresh control. */
export function RefreshIcon() {
  const React = getReact();
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Carbon `checkmark` glyph shown in the selected state of a filter row. */
export function CheckIcon() {
  const React = getReact();
  return (
    <svg viewBox="0 0 32 32" width={14} height={14} aria-hidden="true" focusable="false">
      <path fill="currentColor" d="m13 24l-9-9l1.414-1.414L13 21.171L26.586 7.586L28 9z" />
    </svg>
  );
}
