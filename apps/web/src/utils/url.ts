import { FEED_HOST, KEEPSHARE_ID } from '~build/env';

import { track } from './umami';

type MagnetClickEvent = {
  preventDefault: () => void;
  stopPropagation: () => void;
};

export function splitMagnetURL(magnet: string) {
  return magnet?.split('&')[0] ?? '';
}

/** Opens magnet links without letting analytics/router code treat them as page navigation. */
export function openMagnetLink(
  event: MagnetClickEvent,
  href: string,
  resource: string,
  source: string
) {
  event.preventDefault();
  event.stopPropagation();
  track('download', { resource, source });
  window.location.assign(href);
}

/** Builds the KeepShare player URL for a magnet link. */
export function getKeepShareURL(magnet: string) {
  const url = magnet.split('&')[0];
  return `https://keepshare.org/${KEEPSHARE_ID}/${encodeURIComponent(url)}`;
}

export function getFeedURL(search?: string) {
  return `https://${FEED_HOST}/feed.xml${search ?? ''}`;
}

export function getCollectionFeedURL(hsh: string) {
  return `https://${FEED_HOST}/collection/${hsh}/feed.xml`;
}
