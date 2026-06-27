import { Store } from '@tanstack/store';

export function createSidebarStores() {
  return {
    isOpenSidebarStore: new Store(false)
  };
}
