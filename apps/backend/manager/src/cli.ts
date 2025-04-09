import 'dotenv/config';

import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';

import { app } from './app';

async function main() {
  setGlobalDispatcher(new EnvHttpProxyAgent());
  await app.run(process.argv.slice(2)).catch((err) => console.error(err));
}

main();
