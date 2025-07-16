import { FEED_HOST, KEEPSHARE } from '~build/env';

export function splitMagnetURL(magnet: string) {
  return magnet?.split('&')[0] ?? '';
}

export function getPikPakUrlChecker(magnet: string) {
  const url = magnet.split('&')[0];
  return `https://keepshare.org/${KEEPSHARE}/${encodeURIComponent(url)}`;
}

export function getFeedURL(search?: string) {
  return `https://${FEED_HOST}/feed.xml${search ?? ''}`;
}

export function getCollectionFeedURL(hsh: string) {
  return `https://${FEED_HOST}/collection/${hsh}/feed.xml`;
}
