import { createCollectionStores } from './collection';
import { createFansubsStores } from './fansubs';
import { createSearchStores } from './search';
import { createSidebarStores } from './sidebar';
import { createThemeStores } from './theme';

/**
 * Creates router-scoped browser UI stores. Do not call this outside `createRouter()`.
 */
export function createAppStores() {
  return {
    ...createThemeStores(),
    ...createSearchStores(),
    ...createFansubsStores(),
    ...createCollectionStores(),
    ...createSidebarStores()
  };
}

export type AppStores = ReturnType<typeof createAppStores>;
