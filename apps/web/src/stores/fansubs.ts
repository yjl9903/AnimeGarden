import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Store } from '@tanstack/store';
import { useAppStores } from './hooks';

const preferFansubsKey = 'animegarden:fansubs';

export function createFansubsStores() {
  const preferFansubsStore = new Store(
    import.meta.env.SSR
      ? ([] as string[])
      : (() => {
          try {
            return (JSON.parse(localStorage.getItem(preferFansubsKey) ?? '[]') ?? []) as string[];
          } catch {
            return [];
          }
        })()
  );

  if (!import.meta.env.SSR) {
    preferFansubsStore.subscribe((fansubs) =>
      localStorage.setItem(preferFansubsKey, JSON.stringify(fansubs))
    );
  }

  return {
    preferFansubsStore
  };
}

/**
 * Adds visited fansubs into the router-scoped preference store after hydration.
 */
export function usePreferFansub(fansubs: string[] = []) {
  const hydrated = !import.meta.env.SSR;
  const location = useLocation();
  const { preferFansubsStore } = useAppStores();

  useEffect(() => {
    if (hydrated && fansubs) {
      preferFansubsStore.setState((prefer) => [...new Set([...fansubs, ...prefer])]);
    }
  }, [hydrated, location, fansubs, preferFansubsStore]);
}
