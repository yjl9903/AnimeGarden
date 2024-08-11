import { ufetch } from '@animegarden/cli';
import { fetchLastestANi } from '../packages/scraper/src';

async function main() {
  const data = await fetchLastestANi(ufetch);
  console.log(data);
  return data;
}

main();
