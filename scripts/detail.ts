import { ufetch } from '@animegarden/cli';
import { fetchDmhyDetail } from '../packages/scraper/src';

async function main(id: string) {
  const r = await fetchDmhyDetail(ufetch, id, {
    retry: Number.MAX_SAFE_INTEGER
  });
  console.log(JSON.stringify(r, null, 2));
}

main(process.argv[2]);
