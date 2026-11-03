import { getReact } from '../react.js';
import type { PanelState, PanelStore } from '../stores/panel.js';
import { createPanelStore } from '../stores/panel.js';

/**
 * Create the panel store once for the lifetime of the mounted panel.
 * @returns the store plus its bound actions.
 */
export function usePanelStore(): PanelStore {
  const React = getReact();
  const [store] = React.useState(createPanelStore);
  return store;
}

/**
 * Subscribe one component to a slice of the panel store.
 *
 * The selector must return a stable value (a primitive or an existing object),
 * otherwise the store snapshot changes on every read.
 * @param store - panel store returned by {@link usePanelStore}.
 * @param selector - pure projection from the panel state.
 * @returns the selected slice, re-rendering only when it changes.
 */
export function usePanelState<T>(store: PanelStore, selector: (state: PanelState) => T): T {
  const React = getReact();
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const subscription = store.store.subscribe(onStoreChange);
      return () => subscription.unsubscribe();
    },
    () => selector(store.store.state),
    () => selector(store.store.state)
  );
}
