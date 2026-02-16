import { dim } from 'breadc';
import type { System } from '../system/system.ts';
import { StoragePath } from '../utils/fs.ts';

export function printSpace(system: System) {
  system.logger.log(`${dim('Space')}    ${system.space.root.path}`);

  const storage = Object.entries(system.space.storage);
  const renderPath = (path: StoragePath) => {
    if (path.fs.name === 'node') {
      return path.path;
    }
    return `${path.fs.name}://${path.path}`;
  };
  if (storage.length === 0) {
    system.logger.log(`${dim('Storage')}  ${renderPath(system.space.storage.default)}`);
  } else {
    const length = Math.max(...Object.keys(system.space.storage).map((t) => t.length));
    system.logger.log(
      `${dim('Storage')}  ${'default'.padEnd(length, ' ')}  ${renderPath(system.space.storage.default)}`
    );
    for (const [key, value] of storage) {
      if (key === 'default') continue;
      system.logger.log(`${dim('Storage')}  ${key.padEnd(length, ' ')}  ${renderPath(value)}`);
    }
  }
}
