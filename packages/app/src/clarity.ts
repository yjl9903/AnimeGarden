// @ts-nocheck

export function triggerDownloadEvent(name: string) {
  if (!window.clarity) return;
  try {
    const event = `download:${name}`;
    window.clarity('event', event);
  } catch {}
}

export function triggerPikPakEvent(name: string) {
  if (!window.clarity) return;
  try {
    const event = `pikpak:download`;
    window.clarity('event', event);
  } catch {}
}

export function triggerCollectionEvent(name: string) {
  if (!window.clarity) return;
  try {
    const event = `collection:${name}`;
    window.clarity('event', event);
  } catch {}
}

export function triggerRssEvent(name: string) {
  if (!window.clarity) return;
  try {
    const event = `rss:${name}`;
    window.clarity('event', event);
  } catch {}
}
