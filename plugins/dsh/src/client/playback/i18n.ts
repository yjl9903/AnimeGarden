/**
 * Locale copy owned by the floating playback window.
 *
 * The root `i18n.ts` merges these fragments into the plugin namespace, so the
 * window's slot registration binds the same `t` seat as the panel and the key
 * set stays in one place.
 */

import type { LocaleDictionary } from '../i18n.js';

/** Simplified Chinese copy for the floating player. */
export const playbackZh: LocaleDictionary = {
  playbackTitle: '播放窗口',
  playbackLoading: '正在加载播放页…',
  playbackReload: '重新加载',
  playbackOpenExternal: '在浏览器打开',
  playbackClose: '关闭播放窗口',
  playbackMinimize: '最小化',
  playbackRestore: '还原窗口',
  playbackActions: '播放窗口操作',
  playbackMore: '更多操作'
};

/** English copy for the floating player. */
export const playbackEn: LocaleDictionary = {
  playbackTitle: 'Playback',
  playbackLoading: 'Loading playback page…',
  playbackReload: 'Reload',
  playbackOpenExternal: 'Open in browser',
  playbackClose: 'Close player',
  playbackMinimize: 'Minimize',
  playbackRestore: 'Restore window',
  playbackActions: 'Playback window actions',
  playbackMore: 'More actions'
};
