import fs from 'fs-extra';
import path from 'path';

import { breadc } from 'breadc';
import { Resource } from '../packages/animegarden/src';

const cli = breadc('d1', { version: '0.0.0' });

cli.command('user', 'Generate user sql').action(async (message, option) => {
  const res = await readResources();
  const user = new Map<string, Resource['publisher']>();
  for (const r of res) {
    if (!user.has(r.publisher.id)) {
      user.set(r.publisher.id, r.publisher);
    }
  }
  const lines = [];
  for (const u of user.values()) {
    lines.push(`INSERT OR IGNORE INTO user (id, name) VALUES (${u.id}, '${u.name}');`);
  }
  fs.writeFile('./packages/worker/data/user.sql', lines.join('\n'), 'utf-8');
});

cli.command('team', 'Generate team sql').action(async (message, option) => {
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
    lines.push(
      `INSERT OR IGNORE INTO team (id, name) VALUES (${u.id}, '${u.name.replace(`'`, `''`)}');`
    );
  }
  fs.writeFile('./packages/worker/data/team.sql', lines.join('\n'), 'utf-8');
});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));

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
