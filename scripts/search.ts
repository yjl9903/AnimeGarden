import { setGlobalDispatcher, ProxyAgent } from 'undici';

import { fetchResources } from '../packages/client/src';

async function main() {
  const proxy = getProxy();
  if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));
  const r = await fetchResources({
    search: ['葬送的芙莉蓮'],
    pageSize: 1
  });
  console.log(r.resources);
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

main();
