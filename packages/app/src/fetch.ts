import type { Resource } from 'animegarden';

// import { ProxyAgent } from 'undici';

import { WORKER_BASE } from './constant';

export async function fetchResources(
  page: number,
  options: { fansub?: number; publisher?: number; type?: string } = {}
) {
  const url = new URL(`/resources?page=${page}`, 'https://' + WORKER_BASE);
  if (options.fansub) {
    url.searchParams.set('fansub', '' + options.fansub);
  }
  if (options.publisher) {
    url.searchParams.set('publisher', '' + options.publisher);
  }
  if (options.type) {
    url.searchParams.set('type', options.type);
  }
  // @ts-ignore
  const resources = await fetch(url, {
    // dispatcher:
    //   import.meta.env.DEV && import.meta.env.HTTPS_PROXY
    //     ? new ProxyAgent(import.meta.env.HTTPS_PROXY)
    //     : undefined
  })
    .then((r) => r.json())
    .then((r: any) => r.resources as Resource[]);
  return resources;
}
