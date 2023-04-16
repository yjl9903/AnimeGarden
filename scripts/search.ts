import { ofetch } from 'ofetch/node';
import { HttpsProxyAgent } from 'https-proxy-agent';

import { fetchResources } from '../packages/animegarden/src';

async function main() {
  const r = await fetchResources(
    (url, init) =>
      ofetch.native(url, {
        ...init,
        // @ts-ignore
        agent: process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined
      }),
    {
      search: {
        include: [['機動戰士鋼彈', '机动战士高达'], '水星的魔女', ['第二季', 'Season 2', 'S2']]
      }
    }
  );
  console.log(r.resources);
}

main();
