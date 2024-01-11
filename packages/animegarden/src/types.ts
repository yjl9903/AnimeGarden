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

export interface Resource {
  title: string;

  href: string;

  type: ResourceType;

  magnet: string;

  size: string;

  fansub?: {
    id: string;

    name: string;
  };

  publisher: {
    id: string;

    name: string;
  };

  createdAt: string;

  fetchedAt: string;

  provider: string;
}

export type FetchedResource = Omit<Resource, 'fetchedAt'>;

export interface ResourceDetail {
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
