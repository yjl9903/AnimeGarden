import fs from 'fs-extra';
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
      // @ts-ignore
      const t = env[l];
      if (!!t) {
        return t;
      }
    }
    return undefined;
  }
};

async function main(start: number, dist: string) {
  await fs.mkdir(dist, { recursive: true });

  let empty = 0;
  for (let page = start; ; page++) {
    console.log(`Fetch page ${page}`);

    const r = await fetchDmhyPage(ufetch, {
      page,
      retry: Number.MAX_SAFE_INTEGER
    });

    await fs.promises.writeFile(
      path.join(dist, `${page}.json`),
      JSON.stringify(r, null, 2),
      'utf-8'
    );

    if (r.length === 0) {
      empty++;
      if (empty >= 10) {
        break;
      }
    } else {
      empty = 0;
    }
  }
}

main(1, 'chunk/latest');
