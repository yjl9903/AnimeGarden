import type { ProviderType } from '@animegarden/client';

import type { Provider } from './base';

import { ANiProvider } from './ani';
import { MoeProvider } from './moe';
import { DmhyProvider } from './dmhy';

export type { Provider } from './base';

export const ScraperProviders = new Map<ProviderType, Provider>([
  [ANiProvider.name, new ANiProvider()],
  [MoeProvider.name, new MoeProvider()],
  [DmhyProvider.name, new DmhyProvider()]
]);
