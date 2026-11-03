import { getReact } from '../react.js';

import type { PlaybackState } from './store.js';
import type { PlaybackStore } from './store.js';

/**
 * Subscribe one component to a slice of the playback store.
 *
 * The selector must return a stable value (a primitive or an existing object),
 * otherwise the store snapshot changes on every read.
 * @param store - playback store created once by the plugin.
 * @param selector - pure projection from the playback state.
 * @returns the selected slice, re-rendering only when it changes.
 */
export function usePlaybackState<T>(
  store: PlaybackStore,
  selector: (state: PlaybackState) => T
): T {
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
