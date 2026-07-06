import type { CalendarSubject, DatabaseSubject } from 'bgmx';

import { normalizeTitle } from '@animegarden/client';
import { fetchCalendar, fetchSubjects } from 'bgmx';

import type { SubjectsModule } from './index.ts';
import type { NewSubject, Subject } from './schema.ts';

type SourceSubject = CalendarSubject | DatabaseSubject;

/**
 * Update bgmx calendar from bgm.animes.garden.
 */
export async function updateCalendar(mod: SubjectsModule) {
  const { calendar, web } = await fetchCalendar({
    timeout: 30 * 1000,
    retry: 1
  });
  const onair = [...calendar, web].flat();

  const insertMap = new Map<number, SourceSubject>();
  const archiveMap = new Map<number, Subject>();
  for (const bgm of onair) {
    const id = bgm.id;
    insertMap.set(id, bgm);
  }
  for (const sub of mod.activeSubjects) {
    if (insertMap.has(sub.id)) {
      insertMap.delete(sub.id);
    } else {
      archiveMap.set(sub.id, sub);
    }
  }

  const archived = await mod.archiveSubjects([...archiveMap.keys()]);
  const { subs, errors } = transformSubjects(mod, onair, false);
  const activeSubjects = new Map(mod.activeSubjects.map((subject) => [subject.id, subject]));
  const shouldIndex = new Set(
    subs
      .filter((subject) => {
        const active = activeSubjects.get(subject.id);
        return !active || hasSearchConditionChanged(active, subject);
      })
      .map((subject) => subject.id)
  );

  const inserted: Array<{ id: number; name: string }> = [];
  const conflict: NewSubject[] = [];
  const matchedResourceIds: number[] = [];

  for (const sub of subs) {
    const result = await mod.insertSubject(sub, {
      indexResources: shouldIndex.has(sub.id),
      offset: 30,
      overwrite: false
    });

    if (result) {
      inserted.push({ id: result.id, name: result.name });
      matchedResourceIds.push(...result.matched.map((resource) => resource.id));
    } else {
      conflict.push(sub);
    }
  }

  const resourceIds = [...new Set(matchedResourceIds)];
  if (resourceIds.length > 0) {
    void mod.system.modules.push.enqueueResourceMessages(resourceIds);
  }

  await mod.fetchSubjects();

  return {
    inserted,
    archived,
    conflict,
    errors
  };
}

/**
 * 从 bgmx 导入番剧数据
 * 重置所有 resources 的 subject id
 */
export async function importFromBgmd(mod: SubjectsModule) {
  const subjects: DatabaseSubject[] = [];
  for await (const subject of fetchSubjects({
    timeout: 30 * 1000,
    retry: 1
  })) {
    subjects.push(subject);
  }

  const { subs, errors } = transformSubjects(mod, subjects, true);

  // 时间倒序排序
  subs.sort((lhs, rhs) => {
    const l = lhs.activedAt.getTime();
    const r = rhs.activedAt.getTime();
    if (l < r) {
      return 1;
    } else if (l > r) {
      return -1;
    } else {
      return (rhs.id ?? 0) - (lhs.id ?? 0);
    }
  });

  // 清空所有 resources 的 subject id
  await mod.clearAllSubjectIds();

  // 插入 subject 并生成索引
  const { inserted, conflict } = await mod.insertSubjects(subs, {
    indexResources: true,
    offset: 30,
    overwrite: false
  });

  return {
    // 插入成功
    inserted,
    // 插入失败
    conflict,
    // 非法数据
    errors
  };
}

function transformSubjects(
  mod: SubjectsModule,
  bangumis: SourceSubject[],
  isArchived = true
) {
  const subs: NewSubject[] = [];
  const errors: typeof bangumis = [];

  for (const bgm of bangumis) {
    const bgmId = bgm.id;
    const onairDate = bgm.onair_date || bgm.bangumi.date;
    const activedAt = onairDate ? toShanghai(onairDate) : undefined;
    const keywords = normalizeSearchInclude(bgm);
    const title = getSubjectTitle(bgm);

    if (bgmId && activedAt) {
      subs.push({
        id: bgmId,
        name: title,
        activedAt,
        keywords,
        isArchived
      });
    } else {
      mod.system.logger.warn(`Invalid bangumi item: ${title} (id: ${bgm.id})`);
      errors.push(bgm);
    }
  }

  return { subs, errors };
}

/**
 * 将字符串转换为 UTC+8 时间
 * @param str 形如 2024-01-01 的日期字符串
 * @returns UTC+8 时区下的 Date
 */
function toShanghai(str: string) {
  // 解析输入的日期字符串
  const [year, month, day] = str.split('-').map(Number);

  // 创建一个 UTC 时间的 Date 对象an
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  // 使用上海时区偏移时间，计算对应的 Date 对象
  const shanghaiOffset = 8 * 60; // UTC+8 的分钟偏移
  const shanghaiTime = new Date(utcDate.getTime() - shanghaiOffset * 60 * 1000);

  return !Number.isNaN(shanghaiTime.getTime()) ? shanghaiTime : undefined;
}

function normalizeSearchInclude(bgm: SourceSubject) {
  const keywords = [
    getSubjectTitle(bgm),
    bgm.title,
    ...Object.values(bgm.alias).flat(),
    ...bgm.search.include
  ].map(normalizeTitle);
  return [...new Set(keywords)];
}

function getSubjectTitle(bgm: SourceSubject) {
  return bgm.alias.zh?.[0] || bgm.title;
}

function hasSearchConditionChanged(active: Subject, next: NewSubject) {
  return (
    active.activedAt.getTime() !== next.activedAt.getTime() ||
    active.keywords.length !== next.keywords.length ||
    active.keywords.some((keyword, index) => keyword !== next.keywords[index])
  );
}
