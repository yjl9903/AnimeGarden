import type { PointerEvent as ReactPointerEvent } from 'react';

import type { TranslateFunction } from '../i18n.js';

import { LoadingStatus } from '../components/LoadingStatus.js';
import { LaunchIcon, RefreshIcon } from '../components/icons.js';
import { getReact } from '../react.js';

import type { PlaybackGeometry, PlaybackStore, ResizeDirection, ViewportSize } from './store.js';

import { PLAYBACK_CSS } from './css.js';
import { CloseIcon, MinimizeIcon, MoreIcon, RestoreIcon } from './icons.js';
import {
  clampGeometry,
  defaultGeometry,
  minimizedGeometry,
  readViewportSize,
  resizeGeometry
} from './store.js';
import { usePlaybackState } from './use-playback-store.js';

/** Props the overlay slot passes once the registration binds the plugin locale. */
export interface PlaybackWindowProps {
  t?: TranslateFunction;
}

/** One pointer gesture in progress: moving the window or resizing from a corner. */
interface DragSession {
  mode: 'move' | ResizeDirection;
  pointerId: number;
  startX: number;
  startY: number;
  origin: PlaybackGeometry;
  /** Whether the pointer passed the click threshold during this gesture. */
  moved: boolean;
}

/** Corner handles, named by the corner they sit on. */
const RESIZE_DIRECTIONS: readonly ResizeDirection[] = ['nw', 'ne', 'sw', 'se'];

/** Pointer travel (px) that turns a press into a drag instead of a click. */
const CLICK_SLOP = 4;

/** Controls that must keep their own pointer behavior inside the drag header. */
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [role="menu"]';

/**
 * Build the global floating player.
 *
 * The window is registered into `shell.overlay`, so it stays visible across panel
 * switches, sessions, and the settings pages. It is non-modal: the rest of the
 * Harness keeps working while a video plays. Closing unmounts the iframe, which
 * also stops the playback page; minimizing only hides it, so playback continues.
 *
 * @param playback - plugin-owned playback store shared with the link interceptor.
 * @param fallbackT - translate seat used when the slot does not bind one.
 * @returns the component registered into `shell.overlay`.
 */
export function createPlaybackWindow(playback: PlaybackStore, fallbackT: TranslateFunction) {
  return function PlaybackWindow(props: PlaybackWindowProps) {
    // Classic JSX emits React.createElement, so the loader-provided runtime must be in scope.
    const React = getReact();
    const t = typeof props.t === 'function' ? props.t : fallbackT;

    const target = usePlaybackState(playback, (state) => state.target);
    const storedGeometry = usePlaybackState(playback, (state) => state.geometry);
    const minimized = usePlaybackState(playback, (state) => state.minimized);
    const minimizedAt = usePlaybackState(playback, (state) => state.minimizedAt);
    const nonce = usePlaybackState(playback, (state) => state.nonce);

    const [viewport, setViewport] = React.useState<ViewportSize>(readViewportSize);
    const [dragGeometry, setDragGeometry] = React.useState<PlaybackGeometry | null>(null);
    const [loaded, setLoaded] = React.useState(false);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const drag = React.useRef<DragSession | null>(null);
    const root = React.useRef<HTMLDivElement | null>(null);
    const more = React.useRef<HTMLDivElement | null>(null);
    const menu = React.useRef<HTMLDivElement | null>(null);

    // Keep the window on screen when the user resizes the Harness window.
    React.useEffect(() => {
      const onResize = (): void => setViewport(readViewportSize());
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    // Every new page (or reload) starts behind the loading placeholder again.
    React.useEffect(() => {
      setLoaded(false);
    }, [target, nonce]);

    // Focus the window when it opens so Escape reaches its key handler.
    React.useEffect(() => {
      if (target !== null) root.current?.focus();
    }, [target]);

    // A collapsed window, a new page, or a reload always dismisses the menu.
    React.useEffect(() => {
      setMenuOpen(false);
    }, [target, nonce, minimized]);

    // Dismiss the overflow menu on an outside pointer or Escape. Escape is consumed
    // here so it does not also close the whole playback window.
    React.useEffect(() => {
      if (!menuOpen) return;
      const onPointerDown = (event: PointerEvent): void => {
        const node = event.target instanceof Node ? event.target : null;
        if (node !== null && (menu.current?.contains(node) || more.current?.contains(node))) {
          return;
        }
        setMenuOpen(false);
      };
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(false);
      };
      document.addEventListener('pointerdown', onPointerDown, true);
      document.addEventListener('keydown', onKeyDown, true);
      return () => {
        document.removeEventListener('pointerdown', onPointerDown, true);
        document.removeEventListener('keydown', onKeyDown, true);
      };
    }, [menuOpen]);

    if (target === null) return null;

    // Expanded rectangle from the user's last choice; the minimized bar is a
    // separate, much smaller rectangle so restoring keeps the previous placement.
    const expandedGeometry = clampGeometry(
      dragGeometry ?? storedGeometry ?? defaultGeometry(viewport),
      viewport
    );
    const geometry = minimized
      ? dragGeometry === null
        ? minimizedGeometry(viewport, minimizedAt)
        : minimizedGeometry(viewport, { x: dragGeometry.x, y: dragGeometry.y })
      : expandedGeometry;
    const title = target.title === '' ? t('playbackTitle') : target.title;

    /** Begin moving or resizing; pointer capture keeps events on the grabbed element. */
    const beginDrag = (mode: DragSession['mode']) => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      // Header buttons and links must not start a drag.
      const control =
        event.target instanceof Element ? event.target.closest(INTERACTIVE_SELECTOR) : null;
      if (mode === 'move' && control !== null) return;
      drag.current = {
        mode,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: geometry,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    /** Apply the gesture delta, clamped to the viewport while the pointer moves. */
    const onPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
      const session = drag.current;
      if (session === null || session.pointerId !== event.pointerId) return;
      if (minimized && session.mode !== 'move') return;
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;

      // A press that has not travelled far enough is still a click. Keeping the bar
      // still for that span lets a plain click on the minimized title restore it.
      if (!session.moved && Math.abs(dx) <= CLICK_SLOP && Math.abs(dy) <= CLICK_SLOP) return;
      session.moved = true;

      if (session.mode === 'move') {
        const next = { ...session.origin, x: session.origin.x + dx, y: session.origin.y + dy };
        setDragGeometry(
          minimized ? minimizedGeometry(viewport, next) : clampGeometry(next, viewport)
        );
        return;
      }
      // Corner resize: the opposite corner stays anchored, each edge clamped.
      setDragGeometry(resizeGeometry(session.origin, session.mode, dx, dy, viewport));
    };

    /** Finish the gesture, persist the final rectangle, or restore a clicked bar. */
    const endDrag = (event: ReactPointerEvent<HTMLElement>): void => {
      const session = drag.current;
      if (session === null || session.pointerId !== event.pointerId) return;
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const barClick = minimized && session.mode === 'move' && !session.moved;
      if (dragGeometry !== null) {
        // The minimized bar remembers only its top-left corner, not a size.
        if (minimized) playback.commitMinimizedAt({ x: dragGeometry.x, y: dragGeometry.y });
        else playback.commitGeometry(dragGeometry);
      }
      setDragGeometry(null);
      // Clicking anywhere on the collapsed title bar brings the player back; a drag
      // only moves the bar. Buttons keep their own clicks because they never start
      // a drag session.
      if (barClick) playback.restore();
    };

    return (
      <div
        ref={root}
        className="agp-play"
        role="dialog"
        aria-modal="false"
        aria-label={title}
        tabIndex={-1}
        data-minimized={minimized ? 'true' : undefined}
        style={{
          left: `${geometry.x}px`,
          top: `${geometry.y}px`,
          width: `${geometry.width}px`,
          height: `${geometry.height}px`
        }}
        onKeyDown={(event) => {
          // Escape closes only while the window itself holds focus; the iframe is a
          // separate document and keeps its own keys.
          if (event.key !== 'Escape') return;
          event.stopPropagation();
          playback.close();
        }}
      >
        <style>{PLAYBACK_CSS}</style>
        <header
          className={
            dragGeometry === null ? 'agp-play-head' : 'agp-play-head agp-play-head-dragging'
          }
          onPointerDown={beginDrag('move')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className="agp-play-mark" aria-hidden="true">
            🌸
          </span>
          <span className="agp-play-title" title={title}>
            {title}
          </span>
          <div className="agp-play-actions" role="toolbar" aria-label={t('playbackActions')}>
            {/* Secondary page actions live behind an overflow menu so the header keeps
                only window chrome; the menu is expanded with the window. */}
            {minimized ? null : (
              <div className="agp-play-more" ref={more}>
                <button
                  type="button"
                  className="agp-play-action"
                  aria-label={t('playbackMore')}
                  title={t('playbackMore')}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <MoreIcon />
                </button>
                {menuOpen ? (
                  <div
                    className="agp-play-menu"
                    role="menu"
                    aria-label={t('playbackActions')}
                    ref={menu}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="agp-play-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        playback.reload();
                      }}
                    >
                      <RefreshIcon />
                      <span>{t('playbackReload')}</span>
                    </button>
                    <a
                      role="menuitem"
                      className="agp-play-menu-item"
                      href={target.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      data-agp-playback-ignore=""
                      onClick={() => setMenuOpen(false)}
                    >
                      <LaunchIcon size={14} />
                      <span>{t('playbackOpenExternal')}</span>
                    </a>
                  </div>
                ) : null}
              </div>
            )}
            {/* Window chrome: minimize/restore then close, close always last. */}
            {minimized ? (
              <button
                type="button"
                className="agp-play-action"
                aria-label={t('playbackRestore')}
                title={t('playbackRestore')}
                onClick={() => playback.restore()}
              >
                <RestoreIcon />
              </button>
            ) : (
              <button
                type="button"
                className="agp-play-action"
                aria-label={t('playbackMinimize')}
                title={t('playbackMinimize')}
                onClick={() => playback.minimize()}
              >
                <MinimizeIcon />
              </button>
            )}
            <button
              type="button"
              className="agp-play-action agp-play-action-close"
              aria-label={t('playbackClose')}
              title={t('playbackClose')}
              onClick={() => playback.close()}
            >
              <CloseIcon />
            </button>
          </div>
        </header>
        {/* The body stays mounted while minimized so the iframe (and its audio) keeps
            playing; the `data-minimized` CSS rule hides it and the resize corner. */}
        <div className="agp-play-body">
          <iframe
            key={`${target.url}#${String(nonce)}`}
            className="agp-play-frame"
            src={target.url}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-read; clipboard-write; encrypted-media"
            allowFullScreen
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
          />
          {loaded ? null : (
            <div className="agp-play-loading">
              <LoadingStatus label={t('playbackLoading')} />
            </div>
          )}
        </div>
        {minimized
          ? null
          : RESIZE_DIRECTIONS.map((direction) => (
              <div
                key={direction}
                className={`agp-play-corner agp-play-corner-${direction}`}
                aria-hidden="true"
                onPointerDown={beginDrag(direction)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            ))}
      </div>
    );
  };
}
