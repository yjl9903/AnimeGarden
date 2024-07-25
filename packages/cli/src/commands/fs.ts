import fs from 'fs-extra';
import path from 'node:path';

import type { FetchedResource } from 'animegarden';

export async function readResources(root: string) {
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
  return [...map.values()].sort((lhs, rhs) => lhs.createdAt.localeCompare(rhs.createdAt));
}
