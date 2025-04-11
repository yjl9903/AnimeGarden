import type { Jsonify, ResolvedFilterOptions } from '@animegarden/client';

import { getSubjectById, getSubjectByName, getSubjectDisplayName } from './subjects';

export function generateTitleFromFilter(
  filter:
    | Jsonify<Omit<ResolvedFilterOptions, 'page' | 'pageSize'>>
    | Omit<ResolvedFilterOptions, 'page' | 'pageSize'>
) {
  if (filter.subjects) {
    const names = [];
    for (const id of filter.subjects) {
      const bgm = getSubjectById(id);
      const name = getSubjectDisplayName(bgm);
      if (name) {
        names.push(name);
      }
    }
    if (names.length > 0) {
      return names.join(' ') + ' 最新动画资源';
    }
  }
  if (filter.search && filter.search.length > 0) {
    return filter.search.join(' ') + ' 最新动画资源';
  }
  if (filter.include && filter.include.length > 0) {
    return filter.include[0] + ' 最新动画资源';
  }
  if (filter.fansubs && filter.fansubs.length === 1) {
    return filter.fansubs[0] + ' 最新动画资源';
  }
  if (filter.publishers && filter.publishers.length === 1) {
    return filter.publishers[0] + ' 最新动画资源';
  }
  if (filter.types && filter.types.length === 1) {
    return `最新${filter.types[0]}资源`;
  }
  return '所有资源';
}
