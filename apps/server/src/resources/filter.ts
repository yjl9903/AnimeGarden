import { normalizeTitle } from '@animegarden/shared';

import type { System } from '../system';

import type { DatabaseFilterOptions, DatabaseResource } from './types';

export const BANGUMI_BANNED_FANSUBS = [
  'Kirara Fantasia', // RAWs 搬运组, 刷屏
  '沸班亚马制作组', //
  'GMTeam', // 国漫
  'Lanborey' // 国漫
];

export function buildFilterConds(system: System, filter: DatabaseFilterOptions) {
  const conds: Array<(r: DatabaseResource) => boolean> = [];
  const {
    preset,
    provider,
    duplicate,
    publishers,
    fansubs,
    types,
    subjects,
    before,
    after,
    include,
    keywords,
    exclude
  } = filter;

  if (provider) {
    conds.push((r) => r.provider === provider);
  }
  if (!duplicate) {
    conds.push((r) => r.duplicatedId === null || r.duplicatedId === undefined);
  }

  if (
    (include && include.length > 0) ||
    (keywords && keywords.length > 0) ||
    (exclude && exclude.length > 0)
  ) {
    conds.push((r) => {
      const title = normalizeTitle(r.title).toLowerCase();
      return (
        (include?.some((i) => title.indexOf(i) !== -1) ?? true) &&
        (keywords?.every((i) => title.indexOf(i) !== -1) ?? true) &&
        (exclude?.every((i) => title.indexOf(i) === -1) ?? true)
      );
    });
  }
  if (subjects && subjects.length > 0) {
    conds.push((r) => subjects.some((s) => r.subjectId === s));
  }
  if ((publishers && publishers.length > 0) || (fansubs && fansubs.length > 0)) {
    conds.push(
      (r) =>
        (publishers?.some((p) => r.publisherId === p) ?? false) ||
        (fansubs?.some((p) => r.fansubId === p) ?? false)
    );
  }
  if (types && types.length > 0) {
    conds.push((r) => types.some((t) => r.type === t));
  }
  if (before) {
    const t = before.getTime();
    conds.push((r) => r.createdAt.getTime() <= t);
  }
  if (after) {
    const t = after.getTime();
    conds.push((r) => r.createdAt.getTime() >= t);
  }

  switch (preset) {
    case 'bangumi': {
      const bannedFansubs = BANGUMI_BANNED_FANSUBS.map(
        (name) => system.modules.teams.getByName(name)?.id
      ).filter((id) => id !== undefined);
      if (bannedFansubs.length > 0) {
        conds.push((r) => !r.fansubId || !bannedFansubs.includes(r.fansubId));
      }
    }
  }

  return conds;
}
