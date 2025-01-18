import { and, or, eq, gte, ilike, isNull } from 'drizzle-orm';

import type { System } from '../system';

import { Module } from '../system/module';

import type { IndexOptions, InsertSubjectOptions } from './types';

import { importFromBgmd, updateCalendar } from './bgmd';
import { type NewSubject, type Subject, subjects, resources } from './schema';

export class SubjectsModule extends Module<System['modules']> {
  public static name = 'subjects';

  public readonly subjects: Subject[] = [];

  public async initialize() {
    this.system.logger.info('Initializing Subjects module');
    await this.fetchSubjects();
    await this.updateCalendar();
    this.system.logger.success('Initialize Subjects module OK');
  }

  public async fetchSubjects() {
    const subs = await this.database.select().from(subjects);
    this.subjects.splice(0, this.subjects.length, ...subs);
    return subs;
  }

  public get activedSubjects() {
    return this.subjects.filter((sub) => !sub.isArchived);
  }

  public get archivedSubjects() {
    return this.subjects.filter((sub) => sub.isArchived);
  }

  public async insertSubject(subject: NewSubject, options: InsertSubjectOptions = {}) {
    try {
      this.logger.info(
        `Insert subject ${subject.name} (id: ${subject.bgmId}, ${subject.activedAt.toLocaleDateString()}) -> ${subject.keywords.map((t) => `"${t}"`).join(' ')}`
      );
      const isArchived =
        subject.isArchived === null || subject.isArchived === undefined ? true : subject.isArchived;
      const resp = await this.database
        .insert(subjects)
        .values(subject)
        .onConflictDoUpdate({
          target: subjects.id,
          set: {
            name: subject.name,
            bgmId: subject.bgmId,
            activedAt: subject.activedAt,
            keywords: subject.keywords,
            isArchived
          }
        })
        .returning({
          id: subjects.id,
          name: subjects.name,
          bgmId: subjects.bgmId
        });
      const changed = resp.length > 0;
      if (
        changed &&
        options.indexResources &&
        subject.activedAt.getTime() >= new Date('2000-01-01').getTime()
      ) {
        const offset = (options.offset ?? 31) * 24 * 60 * 60 * 1000;
        const start = new Date(subject.activedAt.getTime() - offset);
        this.logger.info(
          `Start indexing subject ${subject.name} after ${start.toLocaleDateString()}`
        );
        const indexed = await this.indexSubject({ isArchived, ...subject, ...resp[0] }, options);
        this.logger.success(
          `Finish inserting subject ${subject.name} with ${indexed.matched.length} related resources`
        );
      }
      return resp[0];
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }

  public async insertSubjects(subs: NewSubject[], options: InsertSubjectOptions = {}) {
    if (subs.length === 0) {
      return {
        inserted: [],
        conflict: []
      };
    }

    if (options.indexResources) {
      const resp: Array<{ id: number; name: string; bgmId: number | null } | undefined> = [];
      for (const sub of subs) {
        const res = await this.insertSubject(sub, options);
        resp.push(res);
      }
      const map = new Map(resp.filter(Boolean).map((s) => [s!.name, s!] as const));
      return {
        inserted: resp.filter((s) => s),
        conflict: subs.filter((s) => !map.has(s.name))
      };
    } else {
      try {
        const resp = await this.database
          .insert(subjects)
          .values(subs)
          .onConflictDoNothing()
          .returning({ id: subjects.id, name: subjects.name, bgmId: subjects.bgmId });
        const map = new Map(resp.map((s) => [s!.name, s!] as const));
        return {
          inserted: resp,
          conflict: subs.filter((s) => !map.has(s.name))
        };
      } catch (error) {
        this.logger.error(error);
        return {
          inserted: [],
          conflict: [...subs]
        };
      }
    }
  }

  /**
   * Index resources with subject
   *
   * @param subject
   * @param options
   * @returns
   */
  public async indexSubject(
    subject: Subject,
    options: IndexOptions = {}
  ): Promise<{ matched: Array<{ id: number; title: string }>; error?: any }> {
    if (subject.keywords.length === 0) {
      this.logger.warn(`Invalid keywords for ${subject.name} (id ${subject.bgmId})`);
      return {
        matched: []
      };
    }

    try {
      const offset = (options.offset ?? 31) * 24 * 60 * 60 * 1000;
      const start = new Date(subject.activedAt.getTime() - offset);

      const keywords = subject.keywords.map((k) => ilike(resources.titleAlt, `%${k}%`));

      const resp = await this.database
        .update(resources)
        .set({ subjectId: subject.id })
        .where(
          and(
            // 未被删除
            eq(resources.isDeleted, false),
            // 不是重复
            isNull(resources.duplicatedId),
            // 是否覆盖
            options.overwrite ? undefined : isNull(resources.subjectId),
            // 资源时间 >= 开播时间 - 30d
            gte(resources.createdAt, start),
            // 匹配关键词
            or(...keywords)
          )
        )
        .returning({
          id: resources.id,
          title: resources.title
        });

      return {
        matched: resp
      };
    } catch (error) {
      this.logger.error(error);
      return {
        error,
        matched: []
      };
    }
  }

  public async updateCalendar() {
    this.logger.info('Start updating bangumi calendar from bgmd');
    try {
      const resp = await updateCalendar(this);
      this.logger.success('Finish updating calendar from bgmd');
      return resp;
    } catch (error) {
      this.logger.error('Failed update bangumi calendar');
      this.logger.error(error);
    }
  }

  public async importFromBgmd() {
    this.logger.info('Start importing bangumis from bgmd');
    try {
      const resp = await importFromBgmd(this);
      if (resp.conflict.length > 0) {
        for (const item of resp.conflict) {
          this.logger.warn(`Conflict subject: ${item.name} (id: ${item.bgmId})`);
        }
      }
      this.logger.success(`Finish importing ${resp.inserted.length} bangumis`);
      return resp;
    } catch (error) {
      this.logger.error('Failed importing bangumis from bgmd');
      this.logger.error(error);
      process.exit(1);
    }
  }
}
