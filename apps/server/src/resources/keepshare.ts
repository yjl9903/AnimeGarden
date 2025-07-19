export async function prefetchKeepShare(data: Array<{ magnet: string }>) {
  for (const item of data) {
    try {
      const url = 'https://keepshare.org/gv78k1oi/' + encodeURIComponent(item.magnet);
      await fetch(url);
    } catch (error) {
      console.log(error);
    }
  }
}
