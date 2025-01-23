import type { ProviderType } from '../schema/providers';

export interface NotifiedResources {
  id: number;

  provider: ProviderType;

  providerId: string;

  title: string;
}
