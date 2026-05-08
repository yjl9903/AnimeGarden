import type { ProviderType } from '@animegarden/client';

import type { Provider } from './base.ts';

import { ANiProvider } from './ani.ts';
import { MoeProvider } from './moe.ts';
import { DmhyProvider } from './dmhy.ts';
import { MikanProvider } from './mikan.ts';

export type { Provider } from './base.ts';

export const ScraperProviders = new Map<ProviderType, Provider>([
  [DmhyProvider.name, new DmhyProvider()],
  [MikanProvider.name, new MikanProvider()],
  [MoeProvider.name, new MoeProvider()],
  [ANiProvider.name, new ANiProvider()]
]);
