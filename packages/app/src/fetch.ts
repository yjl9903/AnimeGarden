import {
  fetchResources as rawFetchResources,
  fetchResourceDetail as rawFetchResourceDetail
} from 'animegarden';

import { ProxyAgent } from 'undici';

import { WORKER_BASE } from './constant';

const ofetch = (url: string | RequestInfo) =>
  fetch(url, {
    // @ts-ignore
    dispatcher:
      import.meta.env.DEV && import.meta.env.HTTPS_PROXY
        ? new ProxyAgent(import.meta.env.HTTPS_PROXY)
        : undefined
  });

export async function fetchResources(
  page: number,
  options: { fansub?: number; publisher?: number; type?: string } = {}
) {
  return (
    await rawFetchResources(ofetch, {
      baseURL: 'https://' + WORKER_BASE,
      page,
      fansub: options.fansub ? '' + options.fansub : undefined,
      publisher: options.publisher ? '' + options.publisher : undefined,
      type: options.type ? '' + options.type : undefined
    })
  ).resources;
}

export async function fetchResourceDetail(href: string) {
  try {
    return await rawFetchResourceDetail(ofetch, href, {
      baseURL: 'https://' + WORKER_BASE
    });
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
