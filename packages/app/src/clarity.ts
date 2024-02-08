// @ts-nocheck

import { CLARITY } from '~build/meta';

export function triggerDownloadEvent(name: string) {
  if (!CLARITY || !window.clarity) return;
  try {
    const event = `download:${name}`;
    window.clarity('event', event);
  } catch {}
}

export function triggerCollectionEvent(name: string) {
  if (!CLARITY || !window.clarity) return;
  try {
    const event = `collection:${name}`;
    window.clarity('event', event);
  } catch {}
}

export function triggerRssEvent(name: string) {
  if (!CLARITY || !window.clarity) return;
  try {
    const event = `rss:${name}`;
    window.clarity('event', event);
  } catch {}
}
