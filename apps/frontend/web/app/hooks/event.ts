import { type DependencyList, useRef, useEffect } from 'react';

export function useEventListener<T extends Element | Document>(
  element: T | null | undefined,
  event: string,
  handler: (event: any) => void,
  deps: DependencyList = []
) {
  if (!import.meta.env.SSR && element) {
    const saved = useRef<typeof handler>();

    useEffect(() => {
      saved.current = handler;
    }, [handler]);

    useEffect(() => {
      const fn = (ev: Event) => {
        return saved.current?.(ev as any);
      };
      element.addEventListener(event, fn);

      return () => {
        element.removeEventListener(event, fn);
      };
    }, [element, event, ...deps]);
  }
}
