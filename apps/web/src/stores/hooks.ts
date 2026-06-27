import { useRouter } from '@tanstack/react-router';

export function useAppStores() {
  return useRouter().options.context.stores;
}
