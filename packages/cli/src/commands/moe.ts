import fs from 'fs-extra';
import path from 'node:path';

import type { FetchedResource } from 'animegarden';
import type { Database, NewUser, NewTeam, MeiliSearch } from '@animegarden/database';

import { fetchMoePage } from '@animegarden/scraper';

import { ufetch } from '../utils';

export async function fetchMoe(from: number, to: number | undefined, outDir: string) {
  await fs.mkdir(outDir, { recursive: true });
  if ((await fs.readdir(outDir)).length > 0) {
    throw new Error(`Out dir ${outDir} is not empty`);
  }

  let empty = 0;
  for (let page = from; to === undefined || page <= to; page++) {
    console.log(`Fetch moe page ${page}`);

    const r = await fetchMoePage(ufetch, {
      page,
      retry: Number.MAX_SAFE_INTEGER
    });

    await fs.promises.writeFile(
      path.join(outDir, `${page}.json`),
      JSON.stringify(r, null, 2),
      'utf-8'
    );

    if (r.length === 0) {
      empty++;
      if (empty >= 10) {
        break;
      }
    } else {
      empty = 0;
    }
  }
}
