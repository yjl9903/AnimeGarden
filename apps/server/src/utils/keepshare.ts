const DEFAULT_KEEPSHARE_ID = 'gv78k1oi';

export function getKeepShareURL(keepShareId: string | undefined, magnet: string) {
  const url = magnet.split('&')[0];
  return `https://keepshare.org/${keepShareId || DEFAULT_KEEPSHARE_ID}/${encodeURIComponent(url)}`;
}

export async function prefetchKeepShare(
  keepshareId: string | undefined,
  data: Array<{ magnet: string }>
) {
  for (const item of data) {
    try {
      await fetch(getKeepShareURL(keepshareId, item.magnet));
    } catch (error) {
      console.log(error);
    }
  }
}
