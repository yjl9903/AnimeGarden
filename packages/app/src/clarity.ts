import { umami } from '~analytics/umami';
import { clarity } from '~analytics/clarity';

export function triggerDownloadEvent(name: string) {
  if (!clarity) return;

  umami.track('download', { name }).catch(() => {});

  try {
    const event = `download:${name}`;
    clarity('event', event);
  } catch {}
}

export function triggerPikPakEvent(name: string) {
  if (!clarity) return;

  umami.track('pikpak', { name }).catch(() => {});

  try {
    const event = `pikpak:download`;
    clarity('event', event);
  } catch {}
}

export function triggerCollectionEvent(name: string) {
  if (!clarity) return;

  try {
    const event = `collection:${name}`;
    clarity('event', event);
  } catch {}
}

export function triggerRssEvent(name: string) {
  if (!clarity) return;

  try {
    const event = `rss:${name}`;
    clarity('event', event);
  } catch {}
}
