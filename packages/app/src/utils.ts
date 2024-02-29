import type { Env } from './env';

export function removeQuote(words: string[]) {
  return words.map((w) => w.replace(/^(\+|-)?"([^"]*)"$/, '$1$2'));
}

export function getRuntimeEnv(locals: App.Locals): Env | undefined {
  // @ts-ignore
  return locals?.runtime?.env;
}

export function getPikPakUrlChecker(magnet: string) {
  const prefix = magnet.split('&')[0];
  return `https://mypikpak.com/drive/url-checker?url=${prefix}`;
}
