import type { ResolvedFilterOptions, Resource } from './types';

/**
 * TODO
 */
export function makeResourcesFilter(
  filter: Omit<ResolvedFilterOptions, 'page' | 'pageSize' | 'duplicate'>
) {
  const conds: Array<(res: Resource) => boolean> = [];

  return (res: Resource) => {
    return conds.every((c) => c(res));
  };
}
