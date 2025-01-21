import { ANiProvider } from './ani';
import { MoeProvider } from './moe';
import { DmhyProvider } from './dmhy';

export const ScraperProviders = new Map([
  [ANiProvider.name, new ANiProvider()],
  [MoeProvider.name, new MoeProvider()],
  [DmhyProvider.name, new DmhyProvider()]
]);
