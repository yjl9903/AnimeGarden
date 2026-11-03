/**
 * The global floating playback window.
 *
 * One feature directory owns everything the player needs: the KeepShare link
 * detection and document-level click routing (`links.ts`), the window state
 * (`store.ts`), the React window (`window.tsx`), its icons and styles, and the
 * locale fragments merged into the plugin namespace.
 *
 * The window itself is registered into the shell's frame-wide overlay slot, so
 * mounting it here is the only place the feature touches the rest of the plugin.
 */

import type { ClientContext } from '../index.js';
import type { TranslateFunction } from '../i18n.js';

import { NS } from '../i18n.js';

import { installPlaybackLinkInterceptor } from './links.js';
import { createPlaybackStore } from './store.js';
import { createPlaybackWindow } from './window.js';

/** Overlay slot entry id owned by the floating player. */
export const PLAYBACK_SLOT_ID = 'animegarden.playback';

/**
 * Mount the floating player on the Client context.
 *
 * Creates the store shared by the window and the click interceptor, installs the
 * document-level KeepShare routing, and contributes one `shell.overlay` entry
 * that stays mounted across panel and session switches.
 *
 * @param ctx - Client plugin context owning the registrations' lifetime.
 * @param t - translate seat bound to the plugin namespace.
 */
export function registerPlaybackFeature(ctx: ClientContext, t: TranslateFunction): void {
  const playback = createPlaybackStore();
  const PlaybackWindow = createPlaybackWindow(playback, t);

  // Every KeepShare link — panel rows as well as tool results an agent wrote into
  // the conversation — opens the player instead of leaving the app.
  ctx.effect(
    () => installPlaybackLinkInterceptor((target) => playback.open(target)),
    'animegarden: playback link interceptor'
  );

  // The frame-wide overlay layer, outside every column's scroll container, so the
  // player stays open while the user keeps browsing.
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: PLAYBACK_SLOT_ID,
        order: 30,
        locale: NS
      },
      PlaybackWindow
    )
  );
}
