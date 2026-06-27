import { Store } from '@tanstack/store';

const historiesKey = 'animegarden:histories';

export function createSearchStores() {
  const inputStore = new Store('');

  const historiesStore = new Store(
    import.meta.env.SSR
      ? ([] as string[])
      : (() => {
          try {
            return (JSON.parse(localStorage.getItem(historiesKey) ?? '[]') ?? []) as string[];
          } catch {
            return [];
          }
        })()
  );

  if (!import.meta.env.SSR) {
    historiesStore.subscribe((histories) =>
      localStorage.setItem(historiesKey, JSON.stringify(histories))
    );
  }

  return {
    inputStore,
    historiesStore
  };
}
