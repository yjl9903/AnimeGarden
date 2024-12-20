import fs from 'fs-extra';
import path from 'node:path';

import { type Database, type MeiliSearch, insertANiResources } from '@animegarden/database';

import { fetchLastestANi } from '@animegarden/scraper';

import { splitChunks, ufetch } from '../utils';

import { readResources } from './fs';

export async function fetchANi(_from: undefined, _to: undefined, outDir: string) {
  await fs.mkdir(outDir, { recursive: true });
  if ((await fs.readdir(outDir)).length > 0) {
    throw new Error(`Out dir ${outDir} is not empty`);
  }

  console.log(`Fetch ani resources`);

  const r = await fetchLastestANi(ufetch, {
    retry: Number.MAX_SAFE_INTEGER
  });

  await fs.promises.writeFile(path.join(outDir, `ani.json`), JSON.stringify(r, null, 2), 'utf-8');
}

export async function insertANi(database: Database, meili: MeiliSearch, dir: string) {
  const all = await readResources(dir);
  console.log(`Read ${all.length} ani resources`);

  const chunks = splitChunks(all, 1000);
  for (const resources of chunks) {
    const resp = await insertANiResources(database, meili, resources);
    console.log(`Insert ${resp.length} ani resources`);
  }
}
