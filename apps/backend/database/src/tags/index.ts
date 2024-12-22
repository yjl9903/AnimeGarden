import { Module, System } from '../system';

export class TagsModule extends Module<System['modules']> {
  public static name = 'tags';

  public async initialize() {}
}
