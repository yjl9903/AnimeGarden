import { useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';

import { trackRenderError } from '~/utils';
import type { TrackErrorRenderPayload } from '~/utils';

export interface ErrorProps {
  message?: string | React.ReactNode;

  children?: React.ReactNode;

  tracking?: Pick<TrackErrorRenderPayload, 'error'>;
}

export function Error({ message, children, tracking }: ErrorProps) {
  const location = useLocation();
  const trackedRef = useRef<string | undefined>(undefined);
  const messageText = typeof message === 'string' ? message : undefined;
  const path = `${location.pathname}${location.searchStr}`;
  const error = tracking?.error ?? messageText ?? 'unknown-error';
  const trackingKey = JSON.stringify({
    path,
    error
  });

  useEffect(() => {
    if (trackedRef.current === trackingKey) return;

    trackedRef.current = trackingKey;
    trackRenderError({
      path,
      error
    });
  }, [error, path, trackingKey]);

  return (
    <div className="h-20 text-2xl text-red-700/80 flex items-center justify-center">
      <div>
        <span className="mr2 i-carbon-error" />
        <span>发生错误</span>
        {message && (
          <>
            <span>:&nbsp;</span>
            <span>{message}</span>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
