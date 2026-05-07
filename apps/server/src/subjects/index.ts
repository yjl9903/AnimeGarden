import { and, or, eq, gte, ilike, isNull, isNotNull, inArray } from 'drizzle-orm';

import type { System } from '../system';

import { Module } from '../system/module';

import type { IndexOptions, InsertSubjectOptions } from './types';

import { importFromBgmd, updateCalendar } from './bgmd';
import { type NewSubject, type Subject, subjects, resources } from './schema';

type IndexedResource = {
  id: number;
  title: string;
};

type InsertSubjectResult = {
  id: number;
  name: string;
  matched: IndexedResource[];
};

export class SubjectsModule extends Module<System['modules']> {
  public static name = 'subjects';

  public readonly subjects: Subject[] = [];

  public readonly bgms: Map<number, Subject> = new Map();

  public async initialize() {
    this.logger.info('Initializing Subjects module');
    await this.fetchSubjects();
    this.logger.success('Initialize Subjects module OK');
  }

  public async refresh() {
    // this.logger.info('Refreshing Subjects module');
    // await this.fetchSubjects();
    // this.logger.success('Refreshing Subjects module OK');
  }

  public async import() {
    await this.updateCalendar();
  }

  public async fetchSubjects() {
    const subs = await this.database.select().from(subjects);
    this.subjects.splice(0, this.subjects.length, ...subs);
    this.bgms.clear();
    for (const sub of subs) {
      this.bgms.set(sub.id, sub);
    }
    return subs;
  }

  public get activeSubjects() {
    return this.subjects.filter((sub) => !sub.isArchived);
  }

  public get archivedSubjects() {
    return this.subjects.filter((sub) => sub.isArchived);
  }

  public getSubject(id: number) {
    return this.bgms.get(id);
  }

  public async insertSubject(subject: NewSubject, options: InsertSubjectOptions = {}) {
    try {
      this.logger.info(
        `Insert subject ${subject.name} (id: ${subject.id}, ${subject.activedAt.toLocaleDateString()}) -> ${subject.keywords.map((t) => `"${t}"`).join(' ')}`
      );
      const isArchived =
        subject.isArchived === null || subject.isArchived === undefined ? true : subject.isArchived;

      const resp = await this.database
        .insert(subjects)
        .values(subject)
        .onConflictDoUpdate({
          target: [subjects.id],
          set: {
            name: subject.name,
            activedAt: subject.activedAt,
            keywords: subject.keywords,
            isArchived
          }
        })
        .returning({
          id: subjects.id,
          name: subjects.name
        })
        .catch((err) => {
          this.logger.error(err);
          return [];
        });

      const changed = resp.length > 0;
      let matched: IndexedResource[] = [];

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
        matched = indexed.matched;
        this.logger.success(
          `Finish inserting subject ${subject.name} with ${indexed.matched.length} related resources`
        );
      }

      return resp[0]
        ? {
            ...resp[0],
            matched
          }
        : undefined;
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
      const resp: Array<InsertSubjectResult | undefined> = [];
      for (const sub of subs) {
        const res = await this.insertSubject(sub, options);
        resp.push(res);
      }

      // 推送 telegram channel 消息
      const inserted = resp.filter((s): s is InsertSubjectResult => Boolean(s));
      if (options.pushTelegramMessage) {
        const resourceIds = [
          ...new Set(
            inserted
              .flatMap((subject) => subject.matched)
              .map((resource) => resource.id)
              .filter((id) => Number.isFinite(id))
          )
        ];

        if (resourceIds.length > 0) {
          void this.system.modules.push.enqueueResourceMessages(resourceIds);
        }
      }

      const map = new Map(inserted.map((s) => [s.name, s] as const));
      return {
        inserted: inserted.map(({ id, name }) => ({ id, name })),
        conflict: subs.filter((s) => !map.has(s.name))
      };
    } else {
      try {
        const resp = await this.database
          .insert(subjects)
          .values(subs)
          .onConflictDoNothing()
          .returning({ id: subjects.id, name: subjects.name });
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
  ): Promise<{ matched: IndexedResource[]; error?: any }> {
    if (subject.keywords.length === 0) {
      this.logger.warn(`Invalid keywords for ${subject.name} (id ${subject.id})`);
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

  /**
   * 归档过时的 subject
   */
  public async archiveSubjects(ids: number[]) {
    if (ids.length === 0) return [];

    this.logger.info('Start archiving out-of-date subjects');
    const resp = await this.database
      .update(subjects)
      .set({ isArchived: true })
      .where(inArray(subjects.id, ids))
      .returning({ id: subjects.id });
    this.logger.success(`Finish archiving ${resp.length} subjects`);
    return resp;
  }

  /**
   * 清空所有 resources 的 subject id
   */
  public async clearAllSubjectIds() {
    this.logger.info('Start clearing all the subject ids of resources');
    await this.system.database
      .update(resources)
      .set({ subjectId: null })
      .where(isNotNull(resources.subjectId));
    this.logger.success('Finish clearing all the subject ids of resources');
  }

  public async updateCalendar() {
    this.logger.info('Start updating bangumi calendar from bgmd');
    try {
      const resp = await updateCalendar(this);
      this.logger.success('Finish updating bangumi calendar from bgmd');
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
          this.logger.warn(`Conflict subject: ${item.name} (id: ${item.id})`);
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
