import { HttpsProxyAgent } from 'https-proxy-agent';

import { fetchPage } from '../packages/animegarden/src';

async function main() {
  const r = await fetchPage({
    page: 1,
    fetch: {
      agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined
    }
  });
  console.log(r);
}

main();
