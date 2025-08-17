import { atomWithStorage, createJSONStorage } from 'jotai/utils';

export type ThemeMode = 'light' | 'system' | 'dark';

export const themeModeAtom = atomWithStorage<ThemeMode>(
  'animegarden:theme-mode',
  'system',
  createJSONStorage<ThemeMode>(() => localStorage)
);
