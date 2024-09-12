export function removeQuote(words: string[]) {
  return words.map((w) => w.replace(/^(\+|-)?"([^"]*)"$/, '$1$2'));
}

export function getPikPakUrlChecker(magnet: string) {
  const url = magnet.split('&')[0];
  return 'https://keepshare.org/gv78k1oi/' + encodeURIComponent(url);
  // const replaced = prefix.replace(/^magnet:\?xt/, 'magnet:?xt.1');
  // return `https://mypikpak.com/drive/url-checker?url=${replaced}`;
}
