import type { System } from '../system/system';

import { Module } from '../system/module';

import type { InsertSubjectOptions } from './types';

import { importFromBgmd } from './bgmd';
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
      const resp = await this.database
        .insert(subjects)
        .values(subject)
        .onConflictDoUpdate({
          target: subjects.id,
          set: {
            name: subject.name,
            bgmId: subject.bgmId,
            activedAt: subject.activedAt,
            keywords: subject.keywords
          }
        });
      const changed = resp.length > 0;
      if (changed && options.reIndexResources) {
        await this.indexSubject(subject);
      }
      return changed;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  public async indexSubject(subject: NewSubject) {
    // TODO: index subjects
  }

  public async insertSubjects(subs: NewSubject[], options: InsertSubjectOptions = {}) {
    if (options.reIndexResources) {
      const resp = await Promise.all(subs.map((sub) => this.insertSubject(sub, options)));
      return resp.filter(Boolean).length;
    } else {
      try {
        const resp = await this.database.insert(subjects).values(subs).onConflictDoNothing();
        return resp.length;
      } catch (error) {
        this.logger.error(error);
        return 0;
      }
    }
  }

  public async importFromBgmd() {
    return importFromBgmd(this);
  }
}
