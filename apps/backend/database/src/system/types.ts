import type { ProviderType } from '@animegarden/client';

export interface Notification {
  resources: {
    inserted: NotifiedResources[];
  };
}

export interface NotifiedResources {
  id: number;

  provider: ProviderType;

  providerId: string;

  title: string;
}
