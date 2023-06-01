/// <reference types="astro/client" />
/// <reference types="vite-plugin-info/client" />

export interface Env {
  animegarden: KVNamespace;

  worker: {
    fetch: typeof fetch;
  };
}
