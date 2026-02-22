import path from 'node:path';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function md5File(...pathes: string[]) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('md5');
    const stream = createReadStream(path.join(...pathes));

    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
