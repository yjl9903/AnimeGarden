/**
 * Styles for the search-results tool card in the chat transcript.
 *
 * Priority one is the surrounding tool/reasoning rows: the collapsed header
 * mirrors the Harness `ToolRow` metrics (24px line, 16px leading, 6px gap,
 * 13px secondary-tier title and summary, 2×2 dot separator, hover-revealed
 * chevron) so it reads as one more row in "已调用工具". The expanded body then
 * follows the AnimeGarden sidebar panel's resource list (13.5px title link,
 * 12px meta line, fan-sub chip, 28px icon actions).
 *
 * Only theme tokens and the host's content-size variables are used; class names
 * are prefixed `agtv-` so nothing leaks into other plugins.
 */

export const TOOL_VIEW_CSS: string = `
.agtv {
  display: flex;
  flex-direction: column;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
}
.agtv-head {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  height: calc(24px + var(--dsh-content-font-delta, 0px));
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
}
.agtv-head:hover,
.agtv-head:focus-visible,
.agtv[data-expanded='true'] .agtv-head {
  color: var(--dsw-alias-label-primary);
}
.agtv-head:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
  border-radius: var(--dsw-radius-sm, 6px);
}
.agtv-mark {
  flex: none;
  width: 16px;
  font-size: 13px;
  line-height: 1;
  text-align: center;
}
.agtv-title {
  flex: none;
  overflow: hidden;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  font-weight: 400;
  line-height: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agtv-count {
  flex: none;
  overflow: hidden;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agtv-sep {
  flex: none;
  width: 2px;
  height: 2px;
  /* Row gap is 6px; 2px margins make the host row's 8px around the dot. */
  margin: 0 2px;
  background: var(--dsw-alias-label-caption);
  border-radius: 1px;
}
.agtv-summary {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agtv-chevron {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0;
  transition:
    opacity 100ms ease,
    transform 120ms ease;
}
.agtv:hover .agtv-chevron,
.agtv-head:focus-visible .agtv-chevron,
.agtv[data-expanded='true'] .agtv-chevron {
  opacity: 1;
}
.agtv[data-expanded='true'] .agtv-chevron {
  transform: rotate(180deg);
}
/* Harness expanded tool bodies indents off the row: 4px top and start. */
.agtv-body {
  margin: 4px 0 4px 4px;
}
.agtv-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
/* Sidebar panel row, mirrored for the conversation column. */
.agtv-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
  padding: 10px 2px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
.agtv-row:last-child {
  border-bottom: 0;
}
.agtv-row-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.agtv-row-title {
  overflow-wrap: anywhere;
  color: var(--dsw-alias-text-link, #0369a1);
  font-size: 13.5px;
  font-weight: 500;
  line-height: 20px;
  text-decoration: none;
}
a.agtv-row-title:hover {
  color: var(--dsw-alias-text-link-hover, #0ea5e9);
}
.agtv-row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 16px;
}
.agtv-detail {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--dsw-alias-text-link, #0369a1);
  text-decoration: none;
  opacity: 0.6;
}
.agtv-detail:hover {
  color: var(--dsw-alias-text-link-hover, #0ea5e9);
}
.agtv-detail:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agtv-row-tag {
  display: flex;
  flex: none;
  align-items: flex-start;
  padding-top: 2px;
}
.agtv-tag {
  display: inline-block;
  max-width: 180px;
  padding: 1px 8px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--dsw-alias-bg-layer-2);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px);
}
.agtv-row-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
}
.agtv-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--dsw-radius-sm, 6px);
}
a.agtv-icon {
  text-decoration: none;
}
.agtv-icon:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.agtv-icon:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid
    var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.agtv-note {
  padding: 8px 2px;
  color: var(--dsw-alias-label-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.agtv-note-error {
  color: var(--dsw-alias-state-error-primary);
}
@media (prefers-reduced-motion: reduce) {
  .agtv-chevron {
    transition: none;
  }
}
`;
