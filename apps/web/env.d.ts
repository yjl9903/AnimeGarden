/// <reference types="vite-plugin-inline/client" />

/// <reference types="unplugin-info/client" />
/// <reference types="unplugin-analytics/client" />
/// <reference types="unplugin-icons/types/react" />

import type * as CSS from 'csstype';

declare module '~build/env' {
  export const APP_HOST: string;

  export const FEED_HOST: string;

  export const WEB_SERVER_URL: string;

  export const KEEPSHARE_ID: string;
}

declare module 'csstype' {
  interface Properties {
    '--nav-height'?: string;
    '--search-top'?: string;
    '--hero-height'?: string;
    '--offset'?: string;
  }
}

declare global {
  interface Window {
    /**
     * Update hero scroll layout
     */
    updateHeroLayout?: (y?: number) => void;
    __animegardenLayoutController?: {
      update: () => void;
    };
  }
}
