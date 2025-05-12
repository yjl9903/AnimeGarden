import { setGlobalDispatcher, ProxyAgent } from 'undici';

import { fetchResources } from '../packages/client/src';

async function main() {
  const proxy = getProxy();
  if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));
  const r = await fetchResources({
    // include: ['喵萌奶茶屋'],
    search: ['水星的魔女'],
    // provider: 'dmhy',
    // keywords: ['间谍过家家'],
    // type: '合集',
    // fansubs: ['喵萌奶茶屋'],
    hooks: {
      prefetch(path, init) {
        console.log('Request:', path)
        console.log('Headers:', init.headers)
      },
    },
    baseURL: 'http://0.0.0.0:8080'
  });
  console.log(r.resources.length, r.filter);
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
