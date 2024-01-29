import { ufetch } from '@animegarden/cli';
import { fetchResources } from '../packages/animegarden/src';

async function main() {
  const r = await fetchResources(ufetch, {
    include: ['葬送的芙莉蓮']
  });
  console.log(r.resources);
}

main();
