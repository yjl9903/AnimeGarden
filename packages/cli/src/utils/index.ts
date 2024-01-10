export const ufetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
  const proxy = getProxy();
  if (!!proxy) {
    const { ProxyAgent } = await import('undici');
    return fetch(url, {
      ...init,
      // @ts-ignore
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
