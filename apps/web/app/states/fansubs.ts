import { useHydrated } from 'remix-utils/use-hydrated';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useLocation } from '@remix-run/react';

export const preferFansubsAtom = atomWithStorage(
  'animegarden:fansubs',
  [],
  createJSONStorage<string[]>(() => localStorage)
);

export function usePreferFansub(fansubs: string[] = []) {
  const hydrated = useHydrated();
  const location = useLocation();
  const setPrefer = useSetAtom(preferFansubsAtom);

  useEffect(() => {
    if (hydrated && fansubs) {
      setPrefer((prefer) => [...new Set([...fansubs, ...prefer])]);
    }
  }, [hydrated, location]);
}
