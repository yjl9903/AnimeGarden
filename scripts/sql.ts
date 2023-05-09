import fs from 'fs-extra';
import path from 'path';

import { breadc } from 'breadc';

import { Resource } from '../packages/animegarden/src';
import { uploadUsers, uploadTeams, uploadResources } from '../packages/worker/scripts/upload';

const cli = breadc('sql', { version: '0.0.0' });

cli.command('resource [page]', 'Generate resources sql').action(async (page, option) => {
  const res = await readResources();
  const chunkSize = 1000;
  const start = +(page ?? '0');
  for (let i = start * chunkSize, p = start; i < res.length; i += chunkSize, p += 1) {
    const chunk = res.slice(i, i + chunkSize);
    console.log(`Start uploading page ${p} having ${chunk.length} resources`);
    const resp = await uploadResources(chunk);
    console.log(`Uploaded ${resp.count} resources`);
  }
  console.log(`There are ${res.length} resources`);
});

cli.command('user', 'Generate user sql').action(async (option) => {
  const res = await readResources();
  const user = new Map<string, Resource['publisher']>();
  for (const r of res) {
    if (!user.has(r.publisher.id)) {
      user.set(r.publisher.id, r.publisher);
    }
  }
  const rows = [...user.values()].map((u) => ({ id: +u.id, name: u.name }));
  console.log(`Start uploading ${rows.length} users`);
  const resp = await uploadUsers(rows);
  console.log(`Uploaded ${resp.count} users`);
});

cli.command('team', 'Generate team sql').action(async (option) => {
  const res = await readResources();
  const team = new Map<string, Exclude<Resource['fansub'], undefined>>();
  for (const r of res) {
    if (r.fansub) {
      if (!team.has(r.fansub.id)) {
        team.set(r.fansub.id, r.fansub);
      }
    }
  }
  const rows = [...team.values()].map((u) => ({ id: +u.id, name: u.name }));
  console.log(`Start uploading ${rows.length} teams`);
  const resp = await uploadTeams(rows);
  console.log(`Uploaded ${resp.count} teams`);
});

async function readResources(root = 'chunk') {
  const chunks = fs.readdirSync(root);
  const map = new Map<string, Resource>();
  for (const chunk of chunks) {
    const files = fs.readdirSync(path.join(root, chunk));
    const content = (
      await Promise.all(
        files.map(async (file) => {
          const p = path.join(root, chunk, file);
          return JSON.parse(await fs.readFile(p, 'utf-8')) as Resource[];
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

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
