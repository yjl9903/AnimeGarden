/**
 * Registers the search tool's chat card.
 *
 * The card is keyed by the tool's wire name, so it appears wherever the
 * conversation dispatches `animegarden_search_resources`; unclaimed names and
 * every other tool keep the Harness generic row.
 */

import type { ClientContext } from '../index.js';

import { NS } from '../i18n.js';
import { SEARCH_RESOURCES_TOOL_NAME } from '../../shared/tool';

import { AnimeGardenToolView } from './AnimeGardenToolView.js';

/** Registration id used by slot diagnostics. */
const TOOL_VIEW_ID = 'animegarden.search-resources';

/**
 * Mount the result card on the Client context.
 *
 * @param ctx - Client plugin context owning the slot registration lifetime.
 */
export function registerToolView(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register(
      {
        name: 'tool.call.toolview',
        id: TOOL_VIEW_ID,
        key: SEARCH_RESOURCES_TOOL_NAME,
        locale: NS
      },
      AnimeGardenToolView
    )
  );
}
