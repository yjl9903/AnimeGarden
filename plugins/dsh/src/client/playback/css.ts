/**
 * Styles for the global playback window.
 *
 * Rendered by the window component itself (only while a playback page is open),
 * so unmounting the window removes the stylesheet together with the iframe. All
 * colors come from the host theme tokens; the overlay layer already makes its
 * children pointer-interactive, and `pointer-events` is set explicitly in case a
 * future slot wrapper changes that.
 */

export const PLAYBACK_CSS: string = `
.agp-play {
  position: absolute;
  z-index: 30;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  background: var(--dsw-alias-bg-overlay);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md, 10px);
  box-shadow: var(--dsw-elevation-panel);
  pointer-events: auto;
  animation: agp-play-in 140ms ease-out;
}
.agp-play:focus {
  outline: none;
}
.agp-play-head {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  height: 40px;
  padding: 0 6px 0 12px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  touch-action: none;
}
.agp-play-head-dragging {
  cursor: grabbing;
}
.agp-play-mark {
  flex: none;
  font-size: 13px;
  line-height: 1;
}
.agp-play-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agp-play-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
}
/* The overflow anchor keeps secondary actions out of the title row. */
.agp-play-more {
  position: relative;
  display: inline-flex;
  margin-right: 6px;
}
.agp-play-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 3;
  box-sizing: border-box;
  min-width: 168px;
  padding: 4px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm, 6px);
  box-shadow: var(--dsw-elevation-panel);
}
.agp-play-menu-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm, 6px);
}
.agp-play-menu-item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-play-menu-item:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));
  outline-offset: -1px;
}
.agp-play-action {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm, 6px);
}
.agp-play-action:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
/* Close is the destructive window control: last, and tinted on hover. */
.agp-play-action-close:hover {
  color: var(--dsw-alias-state-error-primary);
}
.agp-play-action:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));
  outline-offset: 1px;
}
.agp-play-body {
  position: relative;
  flex: 1;
  min-height: 0;
  background: var(--dsw-alias-bg-base);
}
.agp-play-frame {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--dsw-alias-bg-base);
  border: 0;
}
.agp-play-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-base);
}
/* Four invisible corner resize handles. The top two are L-clipped so the header's
 * trailing controls keep their own pointer area; the directional resize cursor is
 * the only affordance, so no corner marks are drawn. */
.agp-play-corner {
  position: absolute;
  z-index: 2;
  width: 16px;
  height: 16px;
  touch-action: none;
}
.agp-play-corner-nw {
  top: 0;
  left: 0;
  cursor: nwse-resize;
  clip-path: polygon(0 0, 100% 0, 100% 8px, 8px 8px, 8px 100%, 0 100%);
}
.agp-play-corner-ne {
  top: 0;
  right: 0;
  cursor: nesw-resize;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 8px 100%, 8px 8px, 0 8px);
}
.agp-play-corner-sw {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
.agp-play-corner-se {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}
@keyframes agp-play-in {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.995);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* Minimized: only the title bar is visible. The body stays mounted (so the iframe
 * keeps playing) and is hidden with display: none; the corner handles are unmounted
 * by the component and this rule is a belt-and-braces guard. */
.agp-play[data-minimized='true'] .agp-play-body,
.agp-play[data-minimized='true'] .agp-play-corner {
  display: none;
}
.agp-play[data-minimized='true'] .agp-play-head {
  border-bottom: 0;
}
.agp-play[data-minimized='true'] .agp-play-title {
  color: var(--dsw-alias-label-secondary);
}
@media (prefers-reduced-motion: reduce) {
  .agp-play {
    animation: none;
  }
}
`;
