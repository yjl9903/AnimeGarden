import fs from 'fs-extra';
import path from 'path';

import { breadc } from 'breadc';

import { Resource } from '../packages/animegarden/src';

const cli = breadc('d1', { version: '0.0.0' });

cli.command('resource', 'Generate resources sql').action(async (option) => {
  const res = await readResources();
  const lines = [];
  for (const r of res) {
    lines.push(`INSERT IGNORE INTO resource (title, href, type, magnet, size, createdAt, publisherId, fansubId)
    VALUES ('${escape(r.title)}', '${escape(r.href)}', '${escape(r.type)}', '${escape(
      r.magnet
    )}', '${escape(r.size)}', ${new Date(r.createdAt).getTime()}, ${r.publisher.id}, ${
      r.fansub ? r.fansub.id : 'null'
    });
    `);
  }
  const sc: string[] = [];
  const chunkSize = 1000;
  for (let i = 0, p = 0; i < lines.length; p += 1, i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    sc.push(`pnpm -C packages/worker db:exec data/resource-${p}.sql`);
    fs.writeFile(`./packages/worker/data/resource-${p}.sql`, chunk.join('\n'), 'utf-8');
  }
  await fs.writeFile('upload.ps1', sc.join('\n'), 'utf-8');
});

cli.command('user', 'Generate user sql').action(async (option) => {
  const res = await readResources();
  const user = new Map<string, Resource['publisher']>();
  for (const r of res) {
    if (!user.has(r.publisher.id)) {
      user.set(r.publisher.id, r.publisher);
    }
  }
  const lines = [];
  for (const u of user.values()) {
    lines.push(`INSERT IGNORE INTO user (id, name) VALUES (${u.id}, '${escape(u.name)}');`);
  }
  fs.writeFile('./packages/worker/data/user.sql', lines.join('\n'), 'utf-8');
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
  const lines = [];
  for (const u of team.values()) {
    lines.push(`INSERT IGNORE INTO team (id, name) VALUES (${u.id}, '${escape(u.name)}');`);
  }
  fs.writeFile('./packages/worker/data/team.sql', lines.join('\n'), 'utf-8');
});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));

function escape(text: string) {
  return text.replace(/'/g, `\\'`);
}

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
  return [...map.values()];
}
