import type { Jsonify, ResolvedFilterOptions, Resource } from './types';

export function generateFilterShortTitle(
  filter:
    | Jsonify<Omit<ResolvedFilterOptions, 'page' | 'pageSize'>>
    | Omit<ResolvedFilterOptions, 'page' | 'pageSize'>
) {
  if (filter.search && filter.search.length > 0) {
    return filter.search.join(' ') + ' 最新资源';
  }
  if (filter.include && filter.include.length > 0) {
    return filter.include[0] + ' 最新资源';
  }
  if (filter.fansubs && filter.fansubs.length === 1) {
    return filter.fansubs[0] + ' 最新资源';
  }
  if (filter.publishers && filter.publishers.length === 1) {
    return filter.publishers[0] + ' 最新资源';
  }
  if (filter.types && filter.types.length === 1) {
    return `最新${filter.types[0]}资源`;
  }
  return '所有资源';
}

export function makeResourcesFilter(
  filter: Omit<ResolvedFilterOptions, 'page' | 'pageSize' | 'duplicate'>
) {
  const conds: Array<(res: Resource) => boolean> = [];

  return (res: Resource) => {
    return conds.every((c) => c(res));
  };
}
