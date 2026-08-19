import type { CalendarSubject, DatabaseSubject } from 'bgmx';

import { fetchCalendar, fetchSubjects } from 'bgmx';

import type { SubjectsModule } from './index.ts';
import type { NewSubject, Subject } from './schema.ts';

import { isSameSubjectSearch } from './filter.ts';

type SourceSubject = CalendarSubject | DatabaseSubject;

/**
 * Synchronize the full bgmx subject list and overlay the active calendar.
 */
export async function updateCalendar(mod: SubjectsModule) {
  const allSubjects = await fetchAllSubjects();
  const { calendar, web } = await fetchCalendar({
    timeout: 30 * 1000,
    retry: 1
  });
  const onair = [...calendar, web].flat();

  const activeSubjects = new Map(mod.activeSubjects.map((subject) => [subject.id, subject]));
  const { subs: archivedSubs, errors: subjectErrors } = transformSubjects(mod, allSubjects, true);
  const { subs: activeSubs, errors: calendarErrors } = transformSubjects(mod, onair, false);
  const activeIds = new Set(activeSubs.map((subject) => subject.id));
  const mergedSubjects = new Map(archivedSubs.map((subject) => [subject.id, subject]));

  // Overlay the active calendar before writing so an active row is never temporarily archived.
  for (const subject of activeSubs) {
    mergedSubjects.set(subject.id, subject);
  }

  // Preserve local-only rows while moving any stale active subject to its final archived state.
  const archived = mod.activeSubjects
    .filter((subject) => !activeIds.has(subject.id))
    .map((subject) => {
      if (!mergedSubjects.has(subject.id)) {
        mergedSubjects.set(subject.id, { ...subject, isArchived: true });
      }
      return { id: subject.id };
    });

  await mod.upsertSubjects([...mergedSubjects.values()]);

  const shouldIndex = new Set(
    activeSubs
      .filter((subject) => {
        const active = activeSubjects.get(subject.id);
        return !active || hasSearchConditionChanged(active, subject);
      })
      .map((subject) => subject.id)
  );

  const inserted: Array<{ id: number; name: string }> = [];
  const conflict: NewSubject[] = [];
  const matchedResourceIds: number[] = [];

  for (const subject of activeSubs) {
    inserted.push({ id: subject.id, name: subject.name });
    if (shouldIndex.has(subject.id)) {
      // Automatic calendar sync only fills unbound resources. Narrower search conditions never
      // detach or reassign an existing subject id; that requires explicit manual maintenance.
      const result = await mod.indexSubject(
        {
          id: subject.id,
          name: subject.name,
          search: subject.search,
          activedAt: subject.activedAt ?? null,
          isArchived: false
        },
        { overwrite: false }
      );
      matchedResourceIds.push(...result.matched.map((resource) => resource.id));
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
    errors: [...subjectErrors, ...calendarErrors]
  };
}

/**
 * 从 bgmx 导入番剧数据
 * 重置所有 resources 的 subject id
 */
export async function importFromBgmd(mod: SubjectsModule) {
  const subjects = await fetchAllSubjects();

  const { subs, errors } = transformSubjects(mod, subjects, true);

  // 时间倒序排序
  subs.sort((lhs, rhs) => {
    const l = lhs.activedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const r = rhs.activedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
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

async function fetchAllSubjects() {
  const subjects: DatabaseSubject[] = [];
  for await (const subject of fetchSubjects({
    timeout: 30 * 1000,
    retry: 1
  })) {
    subjects.push(subject);
  }
  return subjects;
}

function transformSubjects(mod: SubjectsModule, bangumis: SourceSubject[], isArchived = true) {
  const subs: NewSubject[] = [];
  const errors: typeof bangumis = [];

  for (const bgm of bangumis) {
    const bgmId = bgm.id;
    const onairDate = bgm.onair_date || bgm.bangumi.date;
    const activedAt = onairDate ? (toShanghai(onairDate) ?? null) : null;
    const title = getSubjectTitle(bgm);

    if (bgmId) {
      subs.push({
        id: bgmId,
        name: title,
        activedAt,
        search: bgm.search,
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

function getSubjectTitle(bgm: SourceSubject) {
  return bgm.alias.zh?.[0] || bgm.title;
}

function hasSearchConditionChanged(active: Subject, next: NewSubject) {
  return !isSameSubjectSearch(active.search, next.search);
}
