import type { ProviderType } from '@animegarden/client';

import type { Provider } from './base';

import { ANiProvider } from './ani';
import { MoeProvider } from './moe';
import { DmhyProvider } from './dmhy';
import { MikanProvider } from './mikan';

export type { Provider } from './base';

export const ScraperProviders = new Map<ProviderType, Provider>([
  [DmhyProvider.name, new DmhyProvider()],
  [MikanProvider.name, new MikanProvider()],
  [MoeProvider.name, new MoeProvider()],
  [ANiProvider.name, new ANiProvider()]
]);
