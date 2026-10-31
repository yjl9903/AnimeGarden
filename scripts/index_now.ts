import { fetchAPI } from '../packages/client/src/index';

const APP_HOST = 'animes.garden';

async function submit(urls: string[]) {
  const resp = await fetch(`https://api.indexnow.org/IndexNow`, {
    method: 'POST',
    headers: new Headers([['Content-Type', 'application/json; charset=utf-8']]),
    body: JSON.stringify({
      host: APP_HOST,
      key: '261543988e684693a0dcbd4b9dad2857',
      keyLocation: `https://${APP_HOST}/261543988e684693a0dcbd4b9dad2857.txt`,
      urlList: urls.map((url) => `https://${APP_HOST}${url}`)
    })
  });
  return resp.statusText;
}

const resp1 = await submit([
  `/`,
  `/resources?type=动画`,
  `/resources?type=合集`,
  `/resources?type=音乐`,
  `/resources?type=日剧`,
  `/resources?type=RAW`,
  `/resources?type=漫画`,
  `/resources?type=游戏`,
  `/resources?type=特摄`,
  `/resources?type=其他`
]);

const { teams } = await fetchAPI<{ teams: any[] }>('teams');
const resp2 = await submit(teams.map((t) => `/resources?fansub=${t.name}`));

const { subjects } = await fetchAPI<any>('sitemaps/subjects');
const resp3 = await submit(subjects.map((r: any) => `/subject/${r.id}`));

console.log(resp1, resp2, resp3);

export {};
