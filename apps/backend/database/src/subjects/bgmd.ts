import { isNotNull } from 'drizzle-orm';

import type { FullBangumi } from 'bgmd/types';
import type { calendar as Calendar, web as Web } from 'bgmd/calendar';

import { normalizeTitle } from '@animegarden/client';

import { resources } from '../schema/resources';

import type { NewSubject } from './schema';
import type { SubjectsModule } from './index';

/**
 * @todo
 */
export async function updateCalendar(mod: SubjectsModule) {
  // 1. Load bgmd
  const bgmd = await import('bgmd/calendar', { with: { type: 'json' } });
  // @ts-ignore
  const { calendar, web } = (bgmd?.default ?? bgmd) as {
    calendar: typeof Calendar;
    web: typeof Web;
  };
  const onair = calendar.flat();

  // 2. Diff new subjects
  // 3. Insert new subjects

  return {
    active: [],
    update: [],
    archive: []
  };
}

/**
 * 从 bgmd 导入番剧数据
 * 重置所有 resources 的 subject id
 */
export async function importFromBgmd(mod: SubjectsModule) {
  const bgmd = await import('bgmd', { with: { type: 'json' } });
  // @ts-ignore
  const { bangumis } = (bgmd?.default ?? bgmd) as { bangumis: Omit<FullBangumi, 'summary'>[] };

  const subs: NewSubject[] = [];
  const errors: typeof bangumis = [];

  for (const bgm of bangumis) {
    const bgmId = bgm.bangumi?.id ?? +bgm.id;
    const activedAt = toShanghai(bgm.air_date);
    const keywords = normalizeTags(bgm);

    if (bgmId && activedAt) {
      subs.push({
        name: bgm.name,
        bgmId,
        activedAt,
        keywords,
        isArchived: true
      });
    } else {
      mod.system.logger.warn(`Invalid bangumi item: ${bgm.name} (id: ${bgm.id})`);
      errors.push(bgm);
    }
  }

  // 时间倒序排序
  subs.sort((lhs, rhs) => {
    const l = lhs.activedAt.getTime();
    const r = rhs.activedAt.getTime();
    if (l < r) {
      return 1;
    } else if (l > r) {
      return -1;
    } else {
      return 0;
    }
  });

  // 清空所有 resources 的 subject id
  // mod.logger.info('Start clearing all the subject ids of resources');
  // await mod.system.database
  //   .update(resources)
  //   .set({ subjectId: null })
  //   .where(isNotNull(resources.subjectId));
  // mod.logger.success('Finish clearing all the subject ids of resources');

  // 插入 subject 并生成索引
  const { inserted, conflict } = await mod.insertSubjects(subs, {
    indexResources: true,
    offset: 30,
    overwrite: true
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

function normalizeTags(bgm: Omit<FullBangumi, 'summary'>) {
  const keywords = [bgm.name, ...bgm.alias, ...(bgm.original ?? [])].map(normalizeTitle);
  return [...new Set(keywords)];
}
