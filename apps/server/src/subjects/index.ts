import { and, eq, isNull, isNotNull, inArray, or, sql } from 'drizzle-orm';

import type { System } from '../system/index.ts';

import { Module } from '../system/module.ts';

import type { IndexOptions, InsertSubjectOptions } from './types.ts';

import { importFromBgmd, updateCalendar } from './bgmd.ts';
import { buildSubjectSearchSql, normalizeSubjectSearch } from './filter.ts';
import { type NewSubject, type Subject, subjects, resources } from './schema.ts';

type IndexedResource = {
  id: number;
  title: string;
};

type InsertSubjectResult = {
  id: number;
  name: string;
  matched: IndexedResource[];
};

const SubjectUpsertBatchSize = 1000;

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
        `Insert subject ${subject.name} (id: ${subject.id}, ${subject.activedAt?.toLocaleDateString() ?? 'unknown date'}) -> ${subject.search.include.map((t) => `"${t}"`).join(' ')}`
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
            search: subject.search,
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

      if (changed && options.indexResources) {
        this.logger.info(`Start indexing subject ${subject.name}`);
        const indexed = await this.indexSubject(
          { isArchived, ...subject, activedAt: subject.activedAt ?? null, ...resp[0] },
          options
        );
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

  /** Upsert subjects atomically in bounded batches without running resource indexing. */
  public async upsertSubjects(subs: NewSubject[]) {
    if (subs.length === 0) return [];

    try {
      return await this.database.transaction(async (tx) => {
        const upserted: Array<{ id: number; name: string }> = [];

        for (let offset = 0; offset < subs.length; offset += SubjectUpsertBatchSize) {
          const batch = subs.slice(offset, offset + SubjectUpsertBatchSize).map((subject) => ({
            ...subject,
            activedAt: subject.activedAt ?? null,
            isArchived: subject.isArchived ?? true
          }));
          const resp = await tx
            .insert(subjects)
            .values(batch)
            .onConflictDoUpdate({
              target: [subjects.id],
              set: {
                name: sql.raw(`excluded.${subjects.name.name}`),
                search: sql.raw(`excluded.${subjects.search.name}`),
                activedAt: sql.raw(`excluded.${subjects.activedAt.name}`),
                isArchived: sql.raw(`excluded.${subjects.isArchived.name}`)
              },
              setWhere: or(
                sql`${subjects.name} IS DISTINCT FROM ${sql.raw(`excluded.${subjects.name.name}`)}`,
                sql`${subjects.search}::jsonb IS DISTINCT FROM ${sql.raw(`excluded.${subjects.search.name}`)}::jsonb`,
                sql`${subjects.activedAt} IS DISTINCT FROM ${sql.raw(`excluded.${subjects.activedAt.name}`)}`,
                sql`${subjects.isArchived} IS DISTINCT FROM ${sql.raw(`excluded.${subjects.isArchived.name}`)}`
              )
            })
            .returning({ id: subjects.id, name: subjects.name });
          upserted.push(...resp);
        }

        return upserted;
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
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
    const search = normalizeSubjectSearch(subject.search);
    if (search.include.length === 0) {
      this.logger.warn(`Invalid search.include for ${subject.name} (id ${subject.id})`);
      return {
        matched: []
      };
    }

    try {
      const resp = await this.database
        .update(resources)
        .set({ subjectId: subject.id })
        .where(
          and(
            // 未被删除
            eq(resources.isDeleted, false),
            // 重复资源不会展示，也不需要参与 subject 历史回填
            isNull(resources.duplicatedId),
            // 默认只补偿空绑定；覆盖仅供显式维护调用，自动同步不会解除或改绑旧关联
            options.overwrite ? undefined : isNull(resources.subjectId),
            // 匹配 bgmx search 条件
            buildSubjectSearchSql(subject.search)
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
    this.logger.info('Start updating subjects and bangumi calendar from bgmx');
    try {
      const resp = await updateCalendar(this);
      this.logger.success('Finish updating subjects and bangumi calendar from bgmx');
      return resp;
    } catch (error) {
      this.logger.error('Failed updating subjects and bangumi calendar');
      throw error;
    }
  }

  public async importFromBgmd() {
    this.logger.info('Start importing bangumis from bgmx');
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
