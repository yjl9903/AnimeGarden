import clsx from 'clsx';
import { memo } from 'react';
import { useAtom } from 'jotai';

import { themeModeAtom, type ThemeMode } from '~/states';

export const ThemeToggle = memo(() => {
  const [mode, setMode] = useAtom(themeModeAtom);

  const handleModeChange = (mode: ThemeMode) => {
    setMode(mode);
  };

  return (
    <div className="flex items-center">
      <div className="relative bg-gray-200 dark:bg-dark-800 rounded-full p-1 flex items-center">
        {/* 亮色模式按钮 */}
        <button
          onClick={() => handleModeChange('light')}
          className={clsx(
            'w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer',
            mode === 'light'
              ? 'bg-white shadow-sm transform scale-105'
              : 'hover:bg-gray-100 dark:hover:bg-dark-300'
          )}
        >
          <svg
            className="w-3 h-3 text-gray-800 dark:text-light-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>

        {/* 跟随系统按钮 */}
        <button
          onClick={() => handleModeChange('system')}
          className={clsx(
            'w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 mx-1 cursor-pointer',
            mode === 'system'
              ? 'bg-white shadow-sm transform scale-105'
              : 'hover:bg-gray-100 dark:hover:bg-dark-300'
          )}
        >
          <svg
            className="w-3 h-3 text-gray-800 dark:text-light-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </button>

        {/* 暗色模式按钮 */}
        <button
          onClick={() => handleModeChange('dark')}
          className={clsx(
            'w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer',
            mode === 'dark'
              ? 'bg-dark-100 shadow-sm transform scale-105'
              : 'hover:bg-gray-100 dark:hover:bg-dark-300'
          )}
        >
          <svg
            className="w-3 h-3 text-gray-800 dark:text-light-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </div>
  );
});
