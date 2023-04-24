import { fetch } from 'undici';
import { ProxyAgent } from 'undici';

import { fetchDmhyDetail } from '../packages/animegarden/src';

async function main(id: string) {
  const r = await fetchDmhyDetail(
    (url) =>
      // @ts-ignore
      fetch(url, {
        dispatcher: process.env.HTTPS_PROXY ? new ProxyAgent(process.env.HTTPS_PROXY) : undefined
      }),
    id,
    {
      retry: Number.MAX_SAFE_INTEGER
    }
  );
  console.log(JSON.stringify(r, null, 2));
}

main(process.argv[2]);
