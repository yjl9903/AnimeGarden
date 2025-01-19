import { findFansub, type ResolvedFilterOptions, type ResourceType } from '@animegarden/client';

import { removeQuote } from '@/utils';
import { DisplayType, DisplayTypeColor, QueryType } from '@/constant';

export type DisplayResolvedFilterOptions = ReturnType<typeof resolveFilterOptions>;

export function resolveFilterOptions(filter: Omit<ResolvedFilterOptions, 'page'>) {
  const fansubId = filter.fansubId;
  const fansubs = fansubId
    ? fansubId.map((id) => {
        const provider = 'dmhy';
        const fs = findFansub(provider, id);
        return fs ? fs : { provider, providerId: id, name: id };
      })
    : undefined;

  const rawType = (
    filter.type && filter.type in QueryType ? QueryType[filter.type] : filter.type
  ) as ResourceType | undefined;
  const type = rawType in DisplayType ? DisplayType[rawType] : rawType;

  return {
    publisher: filter.publisherId,
    fansubs,
    type: rawType
      ? {
          name: type,
          color: DisplayTypeColor[type] ?? DisplayTypeColor[rawType]
        }
      : undefined,
    before: filter.before ? new Date(filter.before) : undefined,
    after: filter.after ? new Date(filter.after) : undefined,
    search: filter.search ? removeQuote(filter.search) : [],
    include: filter.include ?? [],
    keywords: filter.keywords ?? [],
    exclude: filter.exclude ?? []
  };
}
