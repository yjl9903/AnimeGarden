import type { System } from '../system/system';

import { Module } from '../system/module';

export class TagsModule extends Module<System['modules']> {
  public static name = 'tags';

  public async initialize() {}

  public async importFromAnipar() {}
}
