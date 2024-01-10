import { fetchDmhy } from '../packages/cli/src';

async function main(start: number, dist: string) {
  await fetchDmhy(start, undefined, dist);
}

main(1, 'chunk/latest');
