import type { FetchResourcesOptions } from './garden/types';

export type ResourceType =
  | '動畫'
  | '季度全集'
  | '漫畫'
  | '港台原版'
  | '日文原版'
  | '音樂'
  | '動漫音樂'
  | '同人音樂'
  | '流行音樂'
  | '日劇'
  | 'ＲＡＷ'
  | '遊戲'
  | '電腦遊戲'
  | '電視遊戲'
  | '掌機遊戲'
  | '網絡遊戲'
  | '遊戲周邊'
  | '特攝'
  | '其他';

export interface Resource<T extends FetchResourcesOptions = FetchResourcesOptions> {
  id?: number;

  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: ResourceType;

  magnet: string;

  tracker: T['tracker'] extends true
    ? string
    : T['tracker'] extends false
      ? null | undefined
      : string | null | undefined;

  size: string;

  fansub?: {
    id: string;

    name: string;

    avatar?: string;
  };

  publisher: {
    id: string;

    name: string;

    avatar?: string;
  };

  createdAt: string;

  fetchedAt: string;
}

export type ResourceWithId<T extends FetchResourcesOptions> = Resource<T> & {
  id: number;
};

export type FetchedResource = Omit<Resource<{ tracker: true }>, 'fetchedAt'>;

export interface ResourceDetail {
  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  size: string;

  createdAt: string;

  fansub?: {
    id: string;

    name: string;

    avatar: string;
  };

  publisher: {
    id: string;

    name: string;

    avatar: string;
  };

  description: string;

  magnet: {
    user: string;

    href: string;

    href2: string;

    ddplay: string;

    files: Array<{ name: string; size: string }>;

    hasMoreFiles: boolean;
  };
}
