/// <reference types="vite-plugin-inline/client" />

/// <reference types="unplugin-info/client" />
/// <reference types="unplugin-analytics/client" />
/// <reference types="unplugin-icons/types/react" />

import type * as CSS from 'csstype';

declare module '~build/env' {
  export const KEEPSHARE: string;

  export const APP_HOST: string;

  export const SERVER_URL: string | undefined;
}

declare module 'csstype' {
  interface Properties {
    '--nav-height'?: string;
    '--search-top'?: string;
    '--hero-height'?: string;
  }
}

declare global {
  interface Window {
    /**
     * Update hero scroll layout
     */
    updateHeroLayout?: (y?: number) => void;
  }
}
