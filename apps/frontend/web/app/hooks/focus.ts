import { useEffect, useState } from 'react';

import { useDocument } from './document';

export const useActiveElement = () => {
  const document = useDocument();
  const [listenersReady, setListenersReady] = useState(false);
  const [activeElement, setActiveElement] = useState(document?.activeElement);

  if (!import.meta.env.SSR) {
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
  }

  return {
    ready: listenersReady,
    active: activeElement
  };
};
