import { CLARITY } from '~build/meta';

export function triggerDownloadEvent(name: string) {
  if (!CLARITY || !window.clarity) return;
  try {
    const event = `download:${name}`;
    window.clarity('event', event);
  } catch {}
}
