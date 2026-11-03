import { getReact } from '../react.js';

/** Props the sidebar passes to a panel glyph. */
export interface AnimeGardenIconProps {
  size?: number;
  active?: boolean;
}

/**
 * Sidebar entry glyph: the 🌸 emoji, which stays legible at every sidebar size
 * where the linear sakura line-art collapsed into a blob.
 * @param props - the sidebar's icon share: requested edge and selection state.
 * @returns the icon element.
 */
export function AnimeGardenIcon({ size = 18, active = false }: AnimeGardenIconProps) {
  // Classic JSX emits React.createElement, so the loader-provided runtime must be in scope.
  const React = getReact();
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        // Emoji glyphs render optically larger than the host's 18px line icons.
        fontSize: Math.round(size * 0.85),
        lineHeight: 1,
        opacity: active ? 1 : 0.85,
        filter: active ? 'none' : 'saturate(0.9)'
      }}
    >
      🌸
    </span>
  );
}
