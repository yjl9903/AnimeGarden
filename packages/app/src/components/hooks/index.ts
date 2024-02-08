import { type DependencyList, useEffect, useState } from 'react';

export const usePageLoadEffect = (fn: () => void, deps?: DependencyList) => {
  useEffect(() => {
    fn();
    document.addEventListener('astro:page-load', fn);
    return () => {
      document.removeEventListener('astro:page-load', fn);
    };
  }, deps);
};

export const useActiveElement = () => {
  const [listenersReady, setListenersReady] = useState(false);
  const [activeElement, setActiveElement] = useState(document.activeElement);

  useEffect(() => {
    const onFocus = (event: FocusEvent) => setActiveElement(event.target as any);
    const onBlur = (event: FocusEvent) => setActiveElement(null);

    window.addEventListener('focus', onFocus, true);
    window.addEventListener('blur', onBlur, true);

    setListenersReady(true);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return {
    active: activeElement,
    ready: listenersReady
  };
};

/**
 * Copied from https://github.com/streamich/react-use/blob/master/src/useSessionStorage.ts
 */
export const useSessionStorage = <T>(
  key: string,
  initialValue?: T,
  raw?: boolean
): [T, (value: T) => void] => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [state, setState] = useState<T>(() => {
    try {
      const sessionStorageValue = sessionStorage.getItem(key);
      if (typeof sessionStorageValue !== 'string') {
        sessionStorage.setItem(key, raw ? String(initialValue) : JSON.stringify(initialValue));
        return initialValue;
      } else {
        return raw ? sessionStorageValue : (JSON.parse(sessionStorageValue || 'null') as any);
      }
    } catch {
      // If user is in private mode or has storage restriction
      // sessionStorage can throw. JSON.parse and JSON.stringify
      // can throw, too.
      return initialValue;
    }
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    try {
      const serializedState = raw ? String(state) : JSON.stringify(state);
      sessionStorage.setItem(key, serializedState);
    } catch {
      // If user is in private mode or has storage restriction
      // sessionStorage can throw. Also JSON.stringify can throw.
    }
  });

  return [state, setState];
};
