import fs from 'node:fs';
import path from 'node:path';
import { fetch } from 'undici';

import { fetchDmhyPage } from '../packages/animegarden/src';

const ufetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
  const proxy = getProxy();
  if (!!proxy) {
    const { ProxyAgent } = await import('undici');
    // @ts-ignore
    return fetch(url, {
      ...init,
      dispatcher: new ProxyAgent(proxy)
    });
  } else {
    // @ts-ignore
    return fetch(url, init);
  }

  function getProxy() {
    const env = process?.env ?? {};
    const list = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'];
    for (const l of list) {
      const t = env[l];
      if (!!t) {
        return t;
      }
    }
    return undefined;
  }
};

async function main(start: number, dist: string) {
  for (let page = start; ; page++) {
    console.log(`Fetch page ${page}`);

    const r = await fetchDmhyPage(ufetch, {
      page,
      retry: Number.MAX_SAFE_INTEGER
    });

    break;

    // await fs.promises.writeFile(
    //   path.join(dist, `${page}.json`),
    //   JSON.stringify(r, null, 2),
    //   'utf-8'
    // );
  }
}

main(1, 'chunk/latest');
