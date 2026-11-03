import type { ResourceRow as ResourceRowModel } from '../api/animegarden.js';
import type { TranslateFunction } from '../i18n.js';

import { track } from '../api/umami.js';
import { getReact } from '../react.js';
import { formatChinaTime } from '../api/animegarden.js';

import { DownloadIcon, LaunchIcon, PlayIcon } from './icons.js';

/** Props for one resource row. */
export interface ResourceRowProps {
  t: TranslateFunction;
  resource: ResourceRowModel;
  onRefineFansub: (name: string) => void;
  onCopyMagnet: (magnet: string) => void;
}

/** One resource: title/play link, metadata, fan-sub tag, and actions. */
export function ResourceRow({ t, resource, onRefineFansub, onCopyMagnet }: ResourceRowProps) {
  const React = getReact();
  const tag = resource.fansub === '' ? resource.publisher : resource.fansub;
  const typeLabel = resource.typeKey !== '' ? t(`type.${resource.typeKey}`) : resource.type;
  const resourceKey = `${resource.provider}:${resource.providerId}`;

  return (
    <li className="agp-row">
      <div className="agp-row-main">
        {resource.keepshareUrl === '' ? (
          <span className="agp-row-title">{resource.title}</span>
        ) : (
          <a
            className="agp-row-title"
            href={resource.keepshareUrl}
            target="_blank"
            rel="noreferrer noopener"
            data-agp-playback-title={resource.title}
            onClick={() => track('pikpak', { resource: resourceKey, source: 'title' })}
          >
            {resource.title}
          </a>
        )}
        <div className="agp-row-meta">
          <span className="agp-row-type">{typeLabel}</span>
          <span>
            {t('published')} {formatChinaTime(resource.createdAt)}
          </span>
          <span>
            {t('size')} {resource.sizeText}
          </span>
          {resource.detailUrl === '' ? null : (
            <a
              className="agp-detail"
              href={resource.detailUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() =>
                track('resources.detail.click', { resource: resourceKey, type: resource.type })
              }
            >
              <LaunchIcon size={14} />
              <span>{t('detail')}</span>
            </a>
          )}
        </div>
      </div>
      {tag === '' ? null : (
        <div className="agp-row-tag">
          {resource.fansub === '' ? (
            <span className="agp-tag">{tag}</span>
          ) : (
            <button
              type="button"
              className="agp-tag agp-tag-button"
              title={`${t('fansubFilter')}: ${resource.fansub}`}
              aria-label={`${t('fansubFilter')}: ${resource.fansub}`}
              onClick={() => onRefineFansub(resource.fansub)}
            >
              {tag}
            </button>
          )}
        </div>
      )}
      <div className="agp-row-actions">
        {resource.keepshareUrl === '' ? null : (
          <a
            className="agp-icon-link"
            href={resource.keepshareUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('play')}
            title={t('play')}
            data-agp-playback-title={resource.title}
            onClick={() => track('pikpak', { resource: resourceKey, source: 'play' })}
          >
            <PlayIcon size={18} />
          </a>
        )}
        {resource.magnet === '' ? null : (
          <button
            type="button"
            className="agp-icon-link"
            onClick={() => {
              track('download', { resource: resourceKey, source: 'download' });
              onCopyMagnet(resource.magnet);
            }}
            aria-label={t('download')}
            title={t('download')}
          >
            <DownloadIcon size={18} />
          </button>
        )}
      </div>
    </li>
  );
}
