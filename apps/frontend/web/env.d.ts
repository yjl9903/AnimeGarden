/// <reference types="unplugin-info/client" />
/// <reference types="unplugin-analytics/client" />

import type * as CSS from 'csstype';

declare module '~build/env' {
  export const KEEPSHARE: string;

  export const APP_HOST: string;

  export const SERVER_URL: string | undefined;
}

declare module 'csstype' {
  interface Properties {
    '--nav-height'?: string;
    '--search-height'?: string;
    '--max-hero-pt'?: string;
    '--max-hero-pb'?: string;
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
