/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="unplugin-info/client" />
/// <reference types="unplugin-analytics/client" />

import type { DirectoryRuntime } from '@astrojs/cloudflare';

declare namespace App {
  export interface Locals extends DirectoryRuntime {}
}

export interface Env {
  animegarden: KVNamespace;

  worker: Fetcher;
}

declare module '~build/meta' {
  export const APP_HOST: string;

  export const SERVER_HOST: string | undefined;

  export const SERVER_PORT: string | undefined;

  export const SERVER_PROTOCOL: string | undefined;
}
