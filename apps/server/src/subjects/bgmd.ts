import type { BasicSubject, FullSubject } from 'bgmd';

import { normalizeTitle } from '@animegarden/client';

import type { SubjectsModule } from './index';
import type { NewSubject, Subject } from './schema';

/**
 * Update yuc.wiki calendar
 */
export async function updateCalendar(mod: SubjectsModule) {
  // 1. Load bgmd
  const bgmd = await import('bgmd/calendar', { with: { type: 'json' } });

  const { calendar, web } = bgmd;
  const onair = [...calendar, web].flat();

  // 2. Diff new subjects
  const insertMap = new Map<number, BasicSubject>();
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

  // 3. Archive old subjects, and insert new subjects
  const archived = await mod.archiveSubjects([...archiveMap.keys()]);
  const { subs, errors } = transformSubjects(mod, onair, false);
  const { inserted, conflict } = await mod.insertSubjects(subs, {
    indexResources: true,
    offset: 30,
    overwrite: false
  });

  // 4. Update mod cache
  await mod.fetchSubjects();

  return {
    inserted,
    archived,
    conflict,
    errors
  };
}

/**
 * 从 bgmd 导入番剧数据
 * 重置所有 resources 的 subject id
 */
export async function importFromBgmd(mod: SubjectsModule) {
  const bgmd = await import('bgmd', { with: { type: 'json' } });

  const { subjects } = bgmd.default;

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
  bangumis: (FullSubject | BasicSubject)[],
  isArchived = true
) {
  const subs: NewSubject[] = [];
  const errors: typeof bangumis = [];

  for (const bgm of bangumis) {
    const bgmId = bgm.id;
    const activedAt = bgm.onair_date ? toShanghai(bgm.onair_date) : undefined;
    const keywords = normalizeSearchInclude(bgm);

    if (bgmId && activedAt) {
      subs.push({
        id: bgmId,
        name: bgm.title,
        activedAt,
        keywords,
        isArchived
      });
    } else {
      mod.system.logger.warn(`Invalid bangumi item: ${bgm.title} (id: ${bgm.id})`);
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

function normalizeSearchInclude(bgm: FullSubject | BasicSubject) {
  const keywords = [bgm.title, ...bgm.search.include].map(normalizeTitle);
  return [...new Set(keywords)];
}
