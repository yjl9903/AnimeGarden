import { Module, type System } from '../system';

import { NewSubject, Subject, subjects } from './schema';

export class SubjectsModule extends Module<System['modules']> {
  public static name = 'subjects';

  public readonly subjects: Subject[] = [];

  public async initialize() {
    await this.fetchSubjects();
  }

  public async fetchSubjects() {
    const subs = await this.database.select().from(subjects);
    this.subjects.splice(0, this.subjects.length, ...subs);
    return subs;
  }

  public async insertSubject(subject: NewSubject, options: InsertSubjectOptions = {}) {
    try {
      this.database.insert(subjects).values(subject).onConflictDoUpdate({
        target: subjects.id,
        set: {
          name: subject.name,
          bgmId: subject.bgmId,
          activedAt: subject.activedAt,
          keywords: subject.keywords
        }
      })
      const resp = await this.database.insert(subjects).values(subject);
      const changed = resp.length > 0;
      if (changed && options.reIndexResources) {
        // TODO: trigger resources update
      }
      return changed;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  public async insertSubjects(subs: NewSubject[], options: InsertSubjectOptions = {}) {
    
  }
}

interface InsertSubjectOptions {
  /**
   * @default false
   */
  reIndexResources?: boolean;
}
