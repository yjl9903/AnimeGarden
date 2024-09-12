import { useLayoutEffect, useState } from 'react';

import { useDocument } from './document';

export const useDocumentScroll = () => {
  const document = useDocument();

  const [state, setState] = useState({
    x: 0,
    y: 0
  });

  if (!import.meta.env.SSR) {
    useLayoutEffect(() => {
      const handler = () => {
        if (document?.documentElement) {
          setState({
            x: document.documentElement.scrollLeft,
            y: document.documentElement.scrollTop
          });
        }
      };

      if (document) {
        document.addEventListener('scroll', handler, {
          capture: false,
          passive: true
        });
      }

      return () => {
        if (document) {
          document.removeEventListener('scroll', handler);
        }
      };
    }, [document]);
  }

  return state;
};
