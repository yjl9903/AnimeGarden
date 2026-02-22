import { bold, dim } from 'breadc';

import type { System } from '../system/system.ts';
import type { Subject } from '../subject/subject.ts';
import type { StoragePath } from '../utils/fs.ts';

export function printSpace(system: System, subjects: Subject[]) {
  system.logger.log(`${dim('空间')}  ${system.space.root.path}`);

  const storage = Object.entries(system.space.storage);
  const renderPath = (path: StoragePath) => {
    if (path.fs.name === 'node') {
      return path.path;
    }
    return `${path.fs.name}://${path.path}`;
  };
  if (storage.length === 1) {
    system.logger.log(`${dim('存储')}  ${renderPath(system.space.storage.default)}`);
  } else {
    const length = Math.max(...Object.keys(system.space.storage).map((t) => t.length));
    system.logger.log(
      `${dim('存储')}  ${'default'.padEnd(length, ' ')}  ${renderPath(system.space.storage.default)}`
    );
    for (const [key, value] of storage) {
      if (key === 'default') continue;
      system.logger.log(`${dim('存储')}  ${key.padEnd(length, ' ')}  ${renderPath(value)}`);
    }
  }

  system.logger.log(`${dim('动画')}  已加载 ${`${subjects.length} 条动画配置`}`);

  system.logger.log();
}
