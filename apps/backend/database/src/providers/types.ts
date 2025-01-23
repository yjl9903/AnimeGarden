import type { ProviderType } from '@animegarden/client';

export interface NotifiedResources {
  id: number;

  provider: ProviderType;

  providerId: string;

  title: string;
}
