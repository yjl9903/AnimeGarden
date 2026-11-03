/**
 * The panel styles: theme tokens only, following the host's list page typography.
 * Kept as one scoped stylesheet rendered by the panel; unmounting removes it.
 *
 * The root/scroll/page split mirrors the host's Plugins page: the content spans
 * the full main column with the same inline padding (`clamp(24px, 4vw, 48px)`)
 * and a reserved scrollbar gutter, so panel edges line up with the native pages
 * and stay stable across tab switches.
 */
export const PANEL_CSS: string = `
/* apps/web uses Quicksand (SIL OFL 1.1) for its hero/brand type. The 700 latin
 * subset is embedded so the plugin never depends on an external font CDN. */
@font-face {
  font-family: 'Quicksand';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(data:font/woff2;base64,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) format('woff2');
}

.agp-root {
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  display: flex;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 14px;
}
.agp-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  --dsh-scrollbar-width: 9px;
  --dsh-scrollbar-thumb-border: 2px;
}
.agp-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 clamp(24px, 4vw, 48px) 48px;
}
.agp-fixed {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--dsw-alias-bg-base);
}
.agp-head {
  padding-top: calc(28px + var(--dsh-frame-top-clearance, 0px));
  margin-bottom: 24px;
}
.agp-title {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-family:
    Quicksand, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
}
.agp-title-link {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.agp-title-emoji {
  display: inline-block;
  margin-right: 12px;
  vertical-align: baseline;
}
.agp-searchbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.agp-input {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
  outline: none;
}
.agp-input::placeholder {
  color: var(--dsw-alias-label-tertiary);
}
/* The native search clear (X) button defaults to the text cursor on WebKit. */
.agp-input::-webkit-search-cancel-button {
  cursor: pointer;
}
.agp-input:focus {
  border-color: var(--dsw-alias-state-business-primary);
  box-shadow: 0 0 0 1px var(--dsw-alias-state-business-primary);
}
.agp-button {
  box-sizing: border-box;
  height: 36px;
  padding: 0 16px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-md);
}
.agp-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agp-button:disabled {
  opacity: 0.45;
  cursor: default;
}
.agp-button-primary {
  color: var(--dsw-alias-label-primary-foreground);
  font-weight: 500;
  background: var(--dsw-alias-button-primary-fill);
  border-color: transparent;
}
.agp-button-primary:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover);
}
.agp-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  /* Hide the weekday/WEB shortcut chips when the panel column gets narrow. */
  container-type: inline-size;
}
@container (max-width: 720px) {
  .agp-week {
    display: none;
  }
}
.agp-toolbar-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.agp-toolbar-button {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: var(--dsw-radius-sm);
}
.agp-toolbar-nav {
  margin-left: auto;
}
.agp-nav-button {
  width: 26px;
  padding: 0;
  justify-content: center;
}
.agp-nav-button:disabled {
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
  opacity: 0.45;
}
.agp-nav-button:disabled:hover {
  background: transparent;
}
.agp-toolbar-button:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-toolbar-button[aria-expanded='true'] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l4);
}
.agp-toolbar-button:focus-visible,
.agp-week-chip:focus-visible,
.agp-week-item:focus-visible,
.agp-dropdown-clear:focus-visible,
.agp-calendar-card:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agp-toolbar-label {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agp-toolbar-divider {
  flex: none;
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--dsw-alias-border-l1);
}
.agp-week {
  position: relative;
}
.agp-week-chip {
  box-sizing: border-box;
  height: 24px;
  padding: 0 8px;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l3);
  border-radius: 999px;
}
.agp-week-chip:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-week-chip[data-active='true'] {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l4);
  font-weight: 500;
}
.agp-week-scroll,
.agp-dropdown-scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l2, rgb(0 0 0 / 22%)) transparent;
  overscroll-behavior: contain;
}
.agp-week-scroll::-webkit-scrollbar,
.agp-dropdown-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.agp-week-scroll::-webkit-scrollbar-track,
.agp-dropdown-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.agp-week-scroll::-webkit-scrollbar-thumb,
.agp-dropdown-scroll::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l2, rgb(0 0 0 / 22%));
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
.agp-week-scroll::-webkit-scrollbar-corner,
.agp-dropdown-scroll::-webkit-scrollbar-corner {
  background: transparent;
}
.agp-week-popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  box-sizing: border-box;
  width: 260px;
  padding: 0;
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  box-shadow: var(--dsw-elevation-panel);
}
.agp-week-scroll {
  max-height: 312px;
  padding: 4px;
  overflow: auto;
}
.agp-week-popover-end {
  right: 0;
  left: auto;
}
.agp-week-bridge {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  z-index: 19;
  height: 8px;
}
.agp-week-item {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 6px 8px;
  appearance: none;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm);
}
.agp-week-item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-week-empty {
  margin: 0;
  padding: 6px 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.agp-dropdown {
  position: relative;
}
.agp-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}
.agp-dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  box-sizing: border-box;
  width: max-content;
  min-width: 144px;
  max-width: 220px;
  padding: 0;
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  box-shadow: var(--dsw-elevation-panel);
}
.agp-dropdown-scroll {
  max-height: 312px;
  padding: 4px;
  overflow: auto;
}
.agp-dropdown-panel-end {
  right: 0;
  left: auto;
}
.agp-dropdown-list {
  display: flex;
  flex-direction: column;
}
.agp-dropdown-option {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 6px 8px;
  appearance: none;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm);
}
.agp-dropdown-option:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-dropdown-check {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: 8px;
  color: var(--dsw-alias-label-primary);
}
.agp-dropdown-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agp-dropdown-foot {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.agp-dropdown-clear {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 6px 8px;
  appearance: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm);
}
.agp-dropdown-clear:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-status {
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.agp-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 2px;
}
.agp-error .agp-status {
  color: var(--dsw-alias-state-error-primary);
}
.agp-error-detail {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--dsw-font-mono, ui-monospace, monospace);
  font-size: 11.5px;
  line-height: 16px;
}
.agp-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}
.agp-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 2px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
.agp-row:last-child {
  border-bottom: 0;
}
.agp-row-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
}
.agp-row-title {
  overflow-wrap: anywhere;
  /* apps/web text-link: sky-700 */
  color: #0369a1;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 20px;
  text-decoration: none;
}
.agp-row-title:hover {
  /* apps/web text-link hover: sky-500 */
  color: #0ea5e9;
}
.agp-row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  margin-top: 4px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 16px;
}
.agp-row-type {
  color: var(--dsw-alias-label-tertiary);
}
.agp-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* apps/web text-link-secondary: sky-700 at 60% */
  color: #0369a1;
  opacity: 0.6;
  text-decoration: none;
}
.agp-detail:hover {
  /* apps/web hover: sky-500 at 60% */
  color: #0ea5e9;
  opacity: 0.6;
}
.agp-detail:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agp-row-tag {
  display: flex;
  flex: none;
  align-items: flex-start;
  padding-top: 2px;
}
.agp-tag {
  display: inline-block;
  max-width: 180px;
  padding: 1px 8px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  text-overflow: ellipsis;
  background: var(--dsw-alias-bg-layer-2);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
}
.agp-tag-button {
  height: auto;
  min-height: 0;
  margin: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
  appearance: none;
}
.agp-tag-button:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-tag-button:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agp-row-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}
.agp-icon-link {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--dsw-alias-label-secondary);
  border: 0.5px solid transparent;
  border-radius: var(--dsw-radius-sm);
}
.agp-icon-link {
  cursor: pointer;
  background: transparent;
  border: none;
}
.agp-icon-link:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.agp-icon-link:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agp-end {
  padding: 16px 0 8px;
  text-align: center;
}
.agp-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 4px;
  margin-top: 24px;
}
.agp-loadmore-status {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}
.agp-spinner {
  color: var(--dsw-alias-state-business-primary, #0369a1);
  animation: agp-spin 0.9s linear infinite;
}
@keyframes agp-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .agp-spinner {
    animation: none;
  }
}
.agp-loadmore-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--dsw-alias-state-error-primary, #b91c1c);
  font-size: 13px;
  line-height: 20px;
}
.agp-retry {
  padding: 0;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  background: transparent;
  border: none;
}
.agp-retry:hover {
  text-decoration-thickness: 2px;
}
.agp-calendar {
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
}
.agp-calendar-head {
  margin-bottom: 20px;
}
.agp-calendar-season-emoji {
  display: inline-flex;
  flex: none;
  margin-right: 12px;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.agp-calendar-title {
  display: flex;
  align-items: center;
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-family:
    Quicksand, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Segoe UI', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 28px;
}
.agp-calendar-section {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  scroll-margin-top: calc(var(--agp-sticky-height, 148px) + 16px);
}
.agp-calendar-section:first-of-type {
  margin-top: 0;
}
.agp-calendar-weekday {
  margin: 0 0 20px;
  color: var(--dsw-alias-label-primary);
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
}
.agp-calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 32px 24px;
}
.agp-calendar-card {
  display: block;
  box-sizing: border-box;
  align-self: start;
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: none;
  appearance: none;
}
.agp-calendar-card-title {
  display: -webkit-box;
  min-height: 40px;
  overflow: hidden;
  padding-top: 10px;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.agp-calendar-card:hover .agp-calendar-card-title {
  /* apps/web anime-title hover: sky-600 */
  color: #0284c7;
}
.agp-calendar-poster {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  background: var(--dsw-alias-bg-layer-2);
  border-radius: var(--dsw-radius-md);
}
@media (max-width: 767.98px) {
  .agp-calendar-grid {
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: 24px 16px;
  }
}
`;
