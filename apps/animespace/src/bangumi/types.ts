import type { BgmClient } from 'bgmc';

export interface BangumiCollectionItem {
  name: string;
  bgm: number;
  naming?: string;
  source: {
    include: string[];
  };
}

export interface BangumiCollectionFile {
  name: string;
  enabled: boolean;
  preference?: {
    animegarden?: {
      after?: string;
      before?: string;
    };
  };
  subjects: BangumiCollectionItem[];
}

export type SearchSubject = Awaited<ReturnType<BgmClient['searchSubjects']>>['data'][number];

export type UserCollection = Awaited<ReturnType<BgmClient['getCollections']>>['data'][number];
