import type { RefObject } from 'react';

import type { TranslateFunction } from '../i18n.js';
import type { ResourceRow as ResourceRowModel } from '../api/animegarden.js';

import { getReact } from '../react.js';

import { ErrorIcon } from './icons.js';
import { ResourceRow } from './ResourceRow.js';
import { LoadingStatus } from './LoadingStatus.js';

/** Props for the search result body. */
export interface ResourceListProps {
  t: TranslateFunction;
  resources: ResourceRowModel[];
  pending: boolean;
  isError: boolean;
  errorMessage: string;
  hasNextPage: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  loadMoreWaiting: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onRetry: () => void;
  onRetryNextPage: () => void;
  onRefineFansub: (name: string) => void;
  onCopyMagnet: (magnet: string) => void;
}

/** Search body: initial loading, error/empty states, the row list, and the sentinel. */
export function ResourceList(props: ResourceListProps) {
  const React = getReact();
  const { t, resources } = props;

  if (props.pending) {
    return <LoadingStatus label={t('loading')} />;
  }
  if (props.isError && resources.length === 0) {
    return (
      <div className="agp-error" role="alert">
        <p className="agp-status">{t('error')}</p>
        <code className="agp-error-detail">{props.errorMessage}</code>
        <button type="button" className="agp-button" onClick={props.onRetry}>
          {t('retry')}
        </button>
      </div>
    );
  }
  if (resources.length === 0) {
    return <p className="agp-status">{t('empty')}</p>;
  }

  return (
    <>
      <ul className="agp-list">
        {resources.map((resource) => (
          <ResourceRow
            key={resource.key}
            t={t}
            resource={resource}
            onRefineFansub={props.onRefineFansub}
            onCopyMagnet={props.onCopyMagnet}
          />
        ))}
      </ul>
      {props.hasNextPage ? (
        <div
          className="agp-sentinel"
          ref={props.sentinelRef}
          aria-busy={props.isFetchingNextPage || props.loadMoreWaiting}
        >
          {props.isFetchNextPageError ? (
            <div role="alert" className="agp-loadmore-error">
              <ErrorIcon size={16} />
              <span>{t('loadMoreFailed')}</span>
              <button type="button" className="agp-retry" onClick={props.onRetryNextPage}>
                {t('retry')}
              </button>
            </div>
          ) : props.isFetchingNextPage || props.loadMoreWaiting ? (
            <LoadingStatus label={t('loading')} />
          ) : null}
        </div>
      ) : (
        <p className="agp-status agp-end">{t('endOfList')}</p>
      )}
    </>
  );
}
