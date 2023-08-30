/// <reference types="astro/client" />
/// <reference types="vite-plugin-info/client" />

import type { DirectoryRuntime } from '@astrojs/cloudflare';

declare namespace App {
  export interface Locals extends DirectoryRuntime {}
}

export interface Env {
  animegarden: KVNamespace;

  worker: Fetcher;
}
