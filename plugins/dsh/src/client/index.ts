import type * as ReactNamespace from 'react';
import type { ComponentType } from 'react';

import { QueryClient } from '@tanstack/react-query';

import type { LocaleHost } from './i18n.js';

import { setReact } from './react.js';
import { AnimeGardenIcon } from './components/SidebarIcon.js';
import { NS, registerLocale } from './i18n.js';
import { createAnimeGardenPanel } from './components/AnimeGardenPanel.js';

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

  return {
    inject: ['slots', 'locale'],
    apply(ctx) {
      // Dictionaries first: the sidebar reads its label through this namespace.
      const t = registerLocale(ctx);

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
