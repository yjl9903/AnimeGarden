import type { Env } from './env';

export function removeQuote(words: string[]) {
  return words.map((w) => w.replace(/^(\+|-)?"([^"]*)"$/, '$1$2'));
}

export function getRuntimeEnv(locals: App.Locals): Env | undefined {
  // @ts-ignore
  return locals?.runtime?.env;
}

const USE_KEEPSHARE = false

export function getPikPakUrlChecker(magnet: string) {
  const url = magnet.split('&')[0];
  if (USE_KEEPSHARE) {
    return 'https://keepshare.org/gv78k1oi/' + encodeURIComponent(url);
  } else {
    const replaced = url.replace(/^magnet:\?xt/, 'magnet:?xt.1');
    return `https://mypikpak.com/drive/url-checker?url=${replaced}`;
  }
}
