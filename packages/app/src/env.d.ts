/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="unplugin-info/client" />

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

  export const WORKER_HOST: string;

  export const CF_BEACON: string | undefined;
}
