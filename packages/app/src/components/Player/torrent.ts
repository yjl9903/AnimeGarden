import type { Instance, Torrent } from 'webtorrent';

const trackers = [
  'http://tracker.gbitt.info/announce',
  'https://tracker.lilithraws.cf/announce',
  'https://tracker1.520.jp/announce',
  'http://www.wareztorrent.com/announce',
  'https://tr.burnabyhighstar.com/announce',
  'http://tk.greedland.net/announce',
  'http://trackme.theom.nz:80/announce',
  'https://tracker.foreverpirates.co:443/announce',
  'http://tracker3.ctix.cn:8080/announce',
  'https://tracker.m-team.cc/announce.php',
  'https://tracker.gbitt.info:443/announce',
  'https://tracker.loligirl.cn/announce',
  'https://tp.m-team.cc:443/announce.php',
  'https://tr.abir.ga/announce',
  'http://tracker.electro-torrent.pl/announce',
  'http://1337.abcvg.info/announce',
  'https://trackme.theom.nz:443/announce',
  'https://tracker.tamersunion.org:443/announce',
  'https://tr.abiir.top/announce',
  'wss://tracker.openwebtorrent.com:443/announce',
  'http://www.all4nothin.net:80/announce.php',
  'https://tracker.kuroy.me:443/announce',
  'https://1337.abcvg.info:443/announce',
  'http://torrentsmd.com:8080/announce',
  'https://tracker.gbitt.info/announce',
  'udp://tracker.sylphix.com:6969/announce'
];

let client: Instance;

export async function makeWebTorrent() {
  if (client) return { client, download };

  const WebTorrent = (await import('webtorrent')).default;
  client = new WebTorrent();

  await new Promise<void>(async (res) => {
    await navigator.serviceWorker.register('/webtorrent-sw.min.js', { scope: './' }).then((reg) => {
      const worker = reg.active || reg.waiting || reg.installing;

      function checkState(worker: ServiceWorker) {
        if (worker.state === 'activated') {
          // @ts-ignore
          const server = client.createServer({ controller: reg });
          if (server) {
            res();
            return true;
          }
        }
        return false;
      }

      if (!checkState(worker)) {
        worker.addEventListener('statechange', ({ target }) => checkState(target as ServiceWorker));
      }
    });
  });

  return {
    client,
    download
  };

  function download(magnetURI: string) {
    return new Promise<Torrent>(async (res) => {
      const existed = await client.get(magnetURI);
      if (existed) {
        res(existed as Torrent);
        return;
      }
      client.add(magnetURI, { announce: trackers }, (torrent) => {
        res(torrent);
      });
    });
  }
}
