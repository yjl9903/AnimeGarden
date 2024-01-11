import fs from 'fs-extra';
import path from 'node:path';

import type { FetchedResource } from 'animegarden';
import type { Database, NewUser, NewTeam } from '@animegarden/database';

import { fetchDmhyPage } from '@animegarden/scraper';
import { insertDmhyResources, insertTeams, insertUsers } from '@animegarden/database';

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
  const map = new Map<string, FetchedResource>();
  const traverse = async (folder: string): Promise<void> => {
    const files = await fs.readdir(folder);
    await Promise.all(
      files.map(async (file) => {
        const stat = await fs.stat(path.join(folder, file));
        if (stat.isDirectory()) {
          await traverse(path.join(folder, file));
        } else if (stat.isFile() && file.endsWith('.json')) {
          const p = path.join(folder, file);
          const content = JSON.parse(await fs.readFile(p, 'utf-8')) as FetchedResource[];
          for (const r of content) {
            if (!map.has(r.href)) {
              map.set(r.href, r);
            }
          }
        }
      })
    );
  };

  await traverse(root);
  return [...map.values()].sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt));
}

function splitChunks<T>(arr: T[], chunkSize = 1000): T[][] {
  const chunkedArray = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunkedArray.push(arr.slice(i, i + chunkSize));
  }
  return chunkedArray;
}

export async function insertDmhy(database: Database, dir: string) {
  const all = await readDmhyResources(dir);
  console.log(`Read ${all.length} dmhy resources`);

  const users = new Map<string, NewUser>();
  const teams = new Map<string, NewTeam>();
  for (const r of all) {
    if (!users.has(r.publisher.id)) {
      users.set(r.publisher.id, {
        provider: 'dmhy',
        providerId: r.publisher.id,
        name: r.publisher.name
      });
    }
    if (r.fansub && !teams.has(r.fansub.id)) {
      teams.set(r.fansub.id, {
        provider: 'dmhy',
        providerId: r.fansub.id,
        name: r.fansub.name
      });
    }
  }

  const usersResp = await insertUsers(database, [...users.values()]);
  console.log(`Insert ${usersResp.length} users`);
  const teamsResp = await insertTeams(database, [...teams.values()]);
  console.log(`Insert ${teamsResp.length} teams`);

  const chunks = splitChunks(all, 100);
  for (const resources of chunks) {
    const resp = await insertDmhyResources(database, resources);
    console.log(`Insert ${resp.length} dmhy resources`);
  }
}
