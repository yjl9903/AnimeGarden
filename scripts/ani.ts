import { ufetch } from '@animegarden/cli';
import { fetchANiDetail } from '../packages/scraper/src';

async function main() {
  const detail = await fetchANiDetail(ufetch, '1858043');
  console.log(detail, detail?.magnet);
}

main();
