/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { hydrateRoot } from 'react-dom/client';
import { startTransition, StrictMode } from 'react';
import { RemixBrowser } from '@remix-run/react';

import '~build/console';
import { NavHeight, HeroHeight, SearchTop } from './layouts/Layout';

{
  let handling = false;
  let heroSearch = document.querySelector('#hero-search');
  let heroPlaceholder = document.querySelector('#hero-placeholder');
  let sidebarRoot: HTMLDivElement | null = document.querySelector('.sidebar-root');
  function updateHero() {
    const y = document.documentElement.scrollTop;

    if (!heroSearch || !heroSearch.isConnected) {
      heroSearch = document.querySelector('#hero-search');
    }
    if (!heroPlaceholder || !heroPlaceholder.isConnected) {
      heroPlaceholder = document.querySelector('#hero-placeholder');
    }
    if (!sidebarRoot || !sidebarRoot.isConnected) {
      sidebarRoot = document.querySelector('.sidebar-root');
    }

    if (y > SearchTop) {
      heroSearch?.classList.add('fix-hero');
    } else {
      heroSearch?.classList.remove('fix-hero');
    }

    if (y > HeroHeight - NavHeight) {
      heroPlaceholder?.classList.add('fix-hero');
      sidebarRoot?.classList.add('fix-hero');
      sidebarRoot?.style.removeProperty('--sidebar-pt');
    } else {
      heroPlaceholder?.classList.remove('fix-hero');
      sidebarRoot?.classList.remove('fix-hero');
      sidebarRoot?.style.setProperty('--sidebar-pt', HeroHeight - y + 'px');
    }

    handling = false;
  }

  function handleScroll() {
    if (handling) return;
    handling = true;
    requestAnimationFrame(updateHero);
  }

  handleScroll();
  document.addEventListener('scroll', handleScroll);
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
