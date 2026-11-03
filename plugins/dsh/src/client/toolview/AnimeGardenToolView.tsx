/**
 * Chat card for one `animegarden_search_resources` result.
 *
 * The Harness Markdown renderer keeps only `http:`/`https:`/`mailto:` anchors, so
 * the Host tool's table reaches the conversation with its magnet links as plain
 * text. Registering this card under the tool's own `tool.call.toolview` key
 * renders the rows with real anchors: the collapsed row mirrors the surrounding
 * tool rows, and the expanded body follows the AnimeGarden sidebar panel.
 *
 * The card is collapsed by default (a search can return up to 100 rows) and
 * falls back to the raw result text when the table does not parse.
 */

import type { ReactElement } from 'react';

import type { TranslateFunction } from '../i18n.js';

import { getReact } from '../react.js';
import { formatChinaTime } from '../api/animegarden.js';
import { ChevronIcon, DownloadIcon, LaunchIcon, PlayIcon } from '../components/icons.js';
import { useMagnetCopy } from '../hooks/useMagnetCopy.js';
import { getPluginOptions } from '../options.js';

import type { ToolViewResource } from './parse.js';

import { TOOL_VIEW_CSS } from './css.js';
import { describeAppliedFilter } from './filter.js';
import { parseAppliedFilter, parseResourceTable } from './parse.js';

/** One content block of the tool result as the client view receives it. */
export interface ToolViewContentBlock {
  type?: string;
  text?: string;
}

/** Stage-specific tool data the card reads; every other phase field is ignored. */
export interface ToolViewPhaseBlock {
  content?: readonly ToolViewContentBlock[];
  isError?: boolean;
  error?: { reason?: string };
}

/** The part of the Tool slot's disclosure hook this card uses. */
export interface ToolViewDisclosure {
  expanded: boolean;
  toggle(): void;
}

/** Props the `tool.call.toolview` registration passes to this card. */
export interface AnimeGardenToolViewProps {
  t?: TranslateFunction;
  phase?: 'preparing' | 'start' | 'result';
  block?: ToolViewPhaseBlock;
  useDisclosure?: () => ToolViewDisclosure;
}

/** Stand-in disclosure used only when the harness omits the owner hook. */
function useLocalDisclosure(): ToolViewDisclosure {
  const React = getReact();
  const [expanded, setExpanded] = React.useState(false);
  return {
    expanded,
    toggle: () => setExpanded((value: boolean) => !value)
  };
}

/** Join the result's text blocks; other media kinds are not rendered here. */
function readText(block: ToolViewPhaseBlock | undefined): string {
  const content = block?.content;
  if (content === undefined) return '';
  const texts: string[] = [];
  for (const entry of content) {
    if (entry !== null && typeof entry === 'object' && entry.type === 'text') {
      if (typeof entry.text === 'string' && entry.text !== '') texts.push(entry.text);
    }
  }
  return texts.join('\n');
}

/** Drop the byte count suffix from the Host renderer's size cell. */
function displaySize(size: string): string {
  return size.replace(/（[^）]*）$/u, '').trim();
}

/** The fan-sub chip prefers the fan-sub name and falls back to the publisher. */
function fanSubTag(resource: ToolViewResource): string {
  const [fansub = '', publisher = ''] = resource.credits.split(' / ');
  return fansub !== '' && fansub !== '未知' ? fansub : publisher === '未知' ? '' : publisher;
}

/** Render one parsed resource as a sidebar-panel-style row. */
function ResourceRowView(props: { t: TranslateFunction; resource: ToolViewResource }) {
  const React = getReact();
  const { t, resource } = props;
  const copyMagnet = useMagnetCopy(t);
  // `openMagnet: false` keeps the card useful by copying the link instead.
  const openMagnet = getPluginOptions().openMagnet;
  const published = formatChinaTime(resource.published);
  const size = displaySize(resource.size);
  const tag = fanSubTag(resource);
  const meta = [resource.type, published, size].filter((value) => value !== '');

  return (
    <li className="agtv-row">
      <div className="agtv-row-main">
        {resource.keepshareUrl === '' ? (
          <span className="agtv-row-title">{resource.title}</span>
        ) : (
          <a
            className="agtv-row-title"
            href={resource.keepshareUrl}
            target="_blank"
            rel="noreferrer noopener"
            data-agp-playback-title={resource.title}
          >
            {resource.title}
          </a>
        )}
        <div className="agtv-row-meta">
          {meta.map((value) => (
            <span key={value}>{value}</span>
          ))}
          {resource.detailUrl === '' ? null : (
            <a
              className="agtv-detail"
              href={resource.detailUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <LaunchIcon size={14} />
              <span>{t('detail')}</span>
            </a>
          )}
        </div>
      </div>
      {tag === '' ? null : (
        <div className="agtv-row-tag">
          <span className="agtv-tag">{tag}</span>
        </div>
      )}
      <div className="agtv-row-actions">
        {resource.keepshareUrl === '' ? null : (
          <a
            className="agtv-icon"
            href={resource.keepshareUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={t('play')}
            title={t('play')}
            data-agp-playback-title={resource.title}
          >
            <PlayIcon size={16} />
          </a>
        )}
        {resource.magnet === '' ? null : openMagnet ? (
          <a
            className="agtv-icon"
            href={resource.magnet}
            data-agp-magnet-link="true"
            aria-label={t('openMagnet')}
            title={t('openMagnetHint')}
            onClick={(event) => {
              // The global interceptor leaves modifier clicks to the row's copy action.
              if (!event.metaKey && !event.ctrlKey && !event.shiftKey) return;
              event.preventDefault();
              void copyMagnet(resource.magnet);
            }}
          >
            <DownloadIcon size={16} />
          </a>
        ) : (
          <button
            type="button"
            className="agtv-icon"
            aria-label={t('copyMagnet')}
            title={t('copyMagnet')}
            onClick={() => void copyMagnet(resource.magnet)}
          >
            <DownloadIcon size={16} />
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Render one search-results tool call in the conversation flow.
 * @param props - the Tool slot owner props this card consumes.
 * @returns the collapsible result card.
 */
export function AnimeGardenToolView(props: AnimeGardenToolViewProps) {
  const React = getReact();
  const t: TranslateFunction = props.t ?? ((key: string) => key);
  const useDisclosure = props.useDisclosure ?? useLocalDisclosure;
  const disclosure = useDisclosure();
  const isResult = props.phase === 'result';

  const content = React.useMemo(() => readText(props.block), [props.block]);
  const resources = React.useMemo(
    () => (isResult ? parseResourceTable(content) : []),
    [isResult, content]
  );
  // The Host prints the filter groups the server actually applied; describe them
  // instead of echoing the raw JSON so the row reads like a sentence.
  const filterText = React.useMemo(
    () => (isResult ? describeAppliedFilter(parseAppliedFilter(content), t) : ''),
    [isResult, content, t]
  );

  const isError = props.block?.isError === true;
  // Result rows read "搜索 Anime Garden 找到 N 个资源 · <筛选描述>"; the count sits
  // before the separator and the filter description only appears when a filter
  // was applied. Running/error rows keep the separator before their status text.
  const countText = isResult && !isError ? t('toolSearchFound', { count: resources.length }) : '';
  const statusText = !isResult ? t('toolSearchRunning') : isError ? t('toolSearchFailed') : '';

  let body: ReactElement | null = null;
  if (disclosure.expanded) {
    if (!isResult) {
      body = <div className="agtv-note">{t('toolSearchRunning')}</div>;
    } else if (isError) {
      const reason = props.block?.error?.reason ?? content.trim();
      body = <div className="agtv-note agtv-note-error">{reason || t('toolSearchFailed')}</div>;
    } else if (resources.length > 0) {
      body = (
        <ul className="agtv-list">
          {resources.map((resource, index) => (
            <ResourceRowView
              key={`${resource.source}-${String(index)}`}
              t={t}
              resource={resource}
            />
          ))}
        </ul>
      );
    } else {
      body = <div className="agtv-note">{content.trim() || t('toolSearchEmpty')}</div>;
    }
  }

  return (
    <div className="agtv" data-expanded={String(disclosure.expanded)}>
      <style>{TOOL_VIEW_CSS}</style>
      <button
        type="button"
        className="agtv-head"
        aria-expanded={disclosure.expanded}
        onClick={disclosure.toggle}
      >
        <span className="agtv-mark" aria-hidden="true">
          🌸
        </span>
        <span className="agtv-title">{t('toolSearchTitle')}</span>
        {countText === '' ? null : <span className="agtv-count">{countText}</span>}
        {statusText === '' ? null : (
          <>
            <span className="agtv-sep" aria-hidden="true" />
            <span className="agtv-summary">{statusText}</span>
          </>
        )}
        {statusText !== '' || filterText === '' ? null : (
          <>
            <span className="agtv-sep" aria-hidden="true" />
            <span className="agtv-summary">{filterText}</span>
          </>
        )}
        <span className="agtv-chevron" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      {body === null ? null : <div className="agtv-body">{body}</div>}
    </div>
  );
}
