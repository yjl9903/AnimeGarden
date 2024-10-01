/// <reference types="unplugin-info/client" />

import type * as CSS from 'csstype';

declare module '~build/meta' {
  export const KEEPSHARE: string;

  export const APP_HOST: string;

  export const SERVER_HOST: string | undefined;

  export const SERVER_PORT: string | undefined;

  export const SERVER_PROTOCOL: string | undefined;

  export const SERVER_BASE: string | undefined;
}

declare module 'csstype' {
  interface Properties {
    '--nav-height'?: string;
  }
}