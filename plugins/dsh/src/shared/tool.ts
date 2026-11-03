/**
 * Wire identity shared by the Host tool and the browser side.
 *
 * The model-facing tool name is also the `tool.call.toolview` key the Client
 * registers its result card under, so both halves read one constant instead of
 * duplicating the string.
 */

/** Name of the resource-search tool exposed to models and dispatched to the tool card. */
export const SEARCH_RESOURCES_TOOL_NAME = 'animegarden_search_resources';
