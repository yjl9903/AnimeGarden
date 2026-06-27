import { Store } from '@tanstack/store';

export type ThemeMode = 'light' | 'system' | 'dark';

const themeModeKey = 'animegarden:theme-mode';

export function createThemeStores() {
  const themeModeStore = new Store<ThemeMode>(
    import.meta.env.SSR
      ? 'system'
      : (() => {
          try {
            return (JSON.parse(localStorage.getItem(themeModeKey) ?? '"system"') ??
              'system') as ThemeMode;
          } catch {
            return 'system';
          }
        })()
  );

  if (!import.meta.env.SSR) {
    themeModeStore.subscribe((mode) => localStorage.setItem(themeModeKey, JSON.stringify(mode)));
  }

  const currentThemeStore = new Store(() => {
    const mode = themeModeStore.state;
    return mode === 'system' ? getSystemTheme() : mode;
  });

  return {
    themeModeStore,
    currentThemeStore
  };
}

/**
 * Gets current system theme.
 */
export function getSystemTheme(): 'light' | 'dark' {
  return import.meta.env.SSR
    ? 'light'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}
