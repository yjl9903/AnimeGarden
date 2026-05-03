import fs from 'node:fs';
import path from 'node:path';

import type { Fansub } from 'anipar';

export function readTestAsset(fansub: Fansub) {
  return fs
    .readFileSync(
      path.join(
        import.meta.dirname,
        `./__assets__/${fansub.toLowerCase().replace(/[ \-]/g, '_')}.csv`
      ),
      'utf-8'
    )
    .split('\n')
    .map((t) => t.trim())
    .map((t) => (t.startsWith(`"`) && t.endsWith(`"`) ? t.slice(1, t.length - 1) : t))
    .filter(Boolean);
}
