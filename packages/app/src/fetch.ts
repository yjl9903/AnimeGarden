import { fetchResources as rawFetchResources } from 'animegarden';

// import { ProxyAgent } from 'undici';

import { WORKER_BASE } from './constant';

export async function fetchResources(
  page: number,
  options: { fansub?: number; publisher?: number; type?: string } = {}
) {
  return (
    await rawFetchResources(
      (url) =>
        fetch(url, {
          // @ts-ignore
          // dispatcher:
          //   import.meta.env.DEV && import.meta.env.HTTPS_PROXY
          //     ? new ProxyAgent(import.meta.env.HTTPS_PROXY)
          //     : undefined
        }),
      {
        baseURL: 'https://' + WORKER_BASE,
        page,
        fansub: options.fansub ? '' + options.fansub : undefined,
        publisher: options.publisher ? '' + options.publisher : undefined,
        type: options.type ? '' + options.type : undefined
      }
    )
  ).resources;
}
