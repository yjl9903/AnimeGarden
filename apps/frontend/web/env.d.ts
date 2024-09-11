/// <reference types="unplugin-info/client" />

import type * as CSS from 'csstype';

declare module '~build/meta' {
  export const APP_HOST: string;

  export const SERVER_URL: string;
}

declare module 'csstype' {
  interface Properties {
    '--nav-height'?: string;
  }
}
