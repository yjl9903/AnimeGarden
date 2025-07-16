import type { ProviderType } from '@animegarden/client';

export interface Notification {
  resources: {
    inserted: NotifiedResources[];

    deleted: number[];
  };

  duplicated: {
    inserted: number[];

    duplicated: number[];
  };
}

export interface NotifiedResources {
  id: number;

  provider: ProviderType;

  providerId: string;

  title: string;
}
