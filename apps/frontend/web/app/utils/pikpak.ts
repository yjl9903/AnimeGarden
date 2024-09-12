import { KEEPSHARE } from '~build/meta';

export function getPikPakUrlChecker(magnet: string) {
  const url = magnet.split('&')[0];
  return `https://keepshare.org/${KEEPSHARE}/${encodeURIComponent(url)}`;
}
