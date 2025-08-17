import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export type ThemeMode = 'light' | 'system' | 'dark';

export const themeModeAtom = atomWithStorage<ThemeMode>(
  'animegarden:theme-mode',
  'system',
  createJSONStorage<ThemeMode>(() => localStorage)
);

// 计算当前实际主题的 atom
export const currentThemeAtom = atom((get) => {
  const mode = get(themeModeAtom);
  return mode === 'system' ? getSystemTheme() : mode;
});

/**
 * 获取当前系统主题
 */
export function getSystemTheme(): 'light' | 'dark' {
  return import.meta.env.SSR
    ? 'light'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
}
