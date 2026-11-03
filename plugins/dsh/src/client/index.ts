import type * as ReactNamespace from 'react';
import type { ComponentType } from 'react';

import { QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import type { LocaleHost } from './i18n.js';

import { setReact } from './react.js';
import { AnimeGardenIcon } from './components/SidebarIcon.js';
import { NS, registerLocale } from './i18n.js';
import { createAnimeGardenPanel } from './components/AnimeGardenPanel.js';
import { registerPlaybackFeature } from './playback/index.js';
import { registerMagnetFeature } from './magnet/index.js';
import { registerToolView } from './toolview/index.js';
import { getPluginOptions } from './options.js';

/** The id shared by the sidebar button and the `main` panel it opens. */
export const PANEL_ID = 'animegarden';

/** Registration options this plugin uses for its two slot declarations. */
interface SlotRegistrationOptions {
  name: string;
  id?: string;
  key?: string;
  order?: number;
  label?: () => string;
  locale?: string;
}

/** Required Client slot service surface. */
interface SlotService {
  inject(slot: string, declare: () => unknown): unknown;

  register<P>(options: SlotRegistrationOptions, component: ComponentType<P>): () => void;
}

/** Client root context slice used by this plugin. */
export interface ClientContext extends LocaleHost {
  slots: SlotService;
}

/** The object the Harness Client module loader installs. */
export interface AnimeGardenPlugin {
  inject: string[];

  apply(ctx: ClientContext): void;
}

/**
 * Compose the Client half from its modules. React stays the only external runtime
 * dependency: the module loader provides it and `react.ts` shares that one instance.
 * @param ReactRuntime - the browser React module supplied by the loader factory.
 * @returns the Cordis client plugin object: required services plus `apply`.
 */
export function createPlugin(ReactRuntime: typeof ReactNamespace): AnimeGardenPlugin {
  setReact(ReactRuntime);

  // One client for the plugin lifetime; the panel wraps itself in its provider.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 60_000
      }
    }
  });
  const AnimeGardenPanel = createAnimeGardenPanel(queryClient);

  /** Keep panel and conversation feedback visible independently of the selected panel. */
  function AnimeGardenToaster() {
    return ReactRuntime.createElement(Toaster, { position: 'bottom-right', theme: 'system' });
  }

  return {
    inject: ['slots', 'locale'],
    apply(ctx) {
      // Dictionaries first: the sidebar reads its label through this namespace.
      const t = registerLocale(ctx);
      // Options arrive as a page global injected by the Host before boot.
      const options = getPluginOptions();

      // One notification host for every surface, including when both features are disabled.
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'animegarden.notifications', order: 40 },
          AnimeGardenToaster
        )
      );

      // The floating player owns its store, overlay entry, and link routing in
      // `./playback/`. Disabled means KeepShare links keep their native
      // new-tab behavior, so the interceptor and overlay are not mounted.
      if (options.embeddedPlayback) registerPlaybackFeature(ctx, t);

      // Magnet anchors anywhere in the page go to the Host's OS opener; the
      // panel's download action and the conversation card both render them.
      // Disabled keeps the panel's copy behavior and leaves foreign anchors
      // untouched.
      if (options.openMagnet) registerMagnetFeature(ctx, t);

      // The search tool's result card; it reuses both global link behaviors
      // above for its play and magnet actions.
      registerToolView(ctx);

      // The sidebar button; its id doubles as the `main` keyed-slot key.
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 30,
            label: () => t('panel'),
            locale: NS
          },
          AnimeGardenIcon
        )
      );

      // The page; clicking the sidebar button selects this key through ctx.layout.
      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS
          },
          AnimeGardenPanel
        )
      );
    }
  };
}
