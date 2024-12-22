import { Module, type System } from '../system';

export class SubjectsModule extends Module<System['modules']> {
  public static name = 'subjects';

  public async initialize() {}
}
