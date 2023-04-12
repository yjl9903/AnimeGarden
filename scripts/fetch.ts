import fs from 'node:fs';
import path from 'node:path';

import ofetch from 'ofetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { fetchResourcePage } from '../packages/animegarden/src';

async function main(start: number, dist: string) {
  for (let page = start; ; page++) {
    console.log(`Fetch page ${page}`);

    const r = await fetchResourcePage(
      ofetch.createFetch({
        // @ts-ignore
        agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined
      }),
      {
        page,
        retry: Number.MAX_SAFE_INTEGER
      }
    );

    await fs.promises.writeFile(
      path.join(dist, `${page}.json`),
      JSON.stringify(r, null, 2),
      'utf-8'
    );
  }
}

main(1196, 'chunk/1');
