import fs from 'fs-extra';
import path from 'node:path';

import type { Database } from '@animegarden/database';
import type { FetchedResource } from 'animegarden';

import { fetchDmhyPage } from '@animegarden/scraper';
import { insertDmhyResources } from '@animegarden/database';

import { ufetch } from '../utils';

export async function fetchDmhy(from: number, to: number | undefined, outDir: string) {
  await fs.mkdir(outDir, { recursive: true });
  if ((await fs.readdir(outDir)).length > 0) {
    throw new Error(`Out dir ${outDir} is not empty`);
  }

  let empty = 0;
  for (let page = from; to === undefined || page <= to; page++) {
    console.log(`Fetch dmhy page ${page}`);

    const r = await fetchDmhyPage(ufetch, {
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

async function readDmhyResources(root: string) {
  // TODO: readdir
  const chunks = fs.readdirSync(root);
  const map = new Map<string, FetchedResource>();
  for (const chunk of chunks) {
    const files = fs.readdirSync(path.join(root, chunk));
    const content = (
      await Promise.all(
        files.map(async (file) => {
          const p = path.join(root, chunk, file);
          return JSON.parse(await fs.readFile(p, 'utf-8')) as FetchedResource[];
        })
      )
    ).flat();
    for (const r of content) {
      if (!map.has(r.href)) {
        map.set(r.href, r);
      }
    }
  }
  return [...map.values()].sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt));
}

export async function insertDmhy(database: Database, dir: string) {
  const resources = await readDmhyResources(dir);
  await insertDmhyResources(database, resources);
}
