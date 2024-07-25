import fs from 'fs-extra';
import path from 'node:path';

import {
  type Database,
  type NewUser,
  type NewTeam,
  type MeiliSearch,
  insertUsers,
  insertTeams,
  insertMoeResources
} from '@animegarden/database';

import { fetchMoePage } from '@animegarden/scraper';

import { splitChunks, ufetch } from '../utils';

import { readResources } from './fs';

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

export async function insertMoe(database: Database, meili: MeiliSearch, dir: string) {
  const all = await readResources(dir);
  console.log(`Read ${all.length} moe resources`);

  const users = new Map<string, NewUser>();
  const teams = new Map<string, NewTeam>();
  for (const r of all) {
    if (!users.has(r.publisher.id)) {
      users.set(r.publisher.id, {
        provider: 'moe',
        providerId: r.publisher.id,
        name: r.publisher.name,
        avatar: r.publisher.avatar
      });
    }
    if (r.fansub && !teams.has(r.fansub.id)) {
      teams.set(r.fansub.id, {
        provider: 'moe',
        providerId: r.fansub.id,
        name: r.fansub.name,
        avatar: r.fansub.avatar
      });
    }
  }

  const usersResp = await insertUsers(database, [...users.values()]);
  console.log(`Insert ${usersResp.length} users`);
  const teamsResp = await insertTeams(database, [...teams.values()]);
  console.log(`Insert ${teamsResp.length} teams`);

  const chunks = splitChunks(all, 1000);
  for (const resources of chunks) {
    const resp = await insertMoeResources(database, meili, resources);
    console.log(`Insert ${resp.length} dmhy resources`);
  }
}
