# 🌸 AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![version](https://img.shields.io/npm/v/anitomy?label=anitomy)](https://www.npmjs.com/package/anitomy)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)
[![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)

動漫花園 3-rd party [mirror site](https://garden.onekuma.cn).

+ ☁️ Provide [API endpoint](https://garden.onekuma.cn/api/resources)
+ 🔖 Support Advanced search, i.e. `我推的孩子 fansub:桜都字幕组 include:简日内嵌`
+ 📙 Generate RSS feed, i.e. [我的百合乃工作是也！](https://garden.onekuma.cn/feed.xml?search=%5B%22%E6%88%91%E7%9A%84%E7%99%BE%E5%90%88%E4%B9%83%E5%B7%A5%E4%BD%9C%E6%98%AF%E4%B9%9F%22%5D&include=%5B%22%E7%AE%80%E4%BD%93%22%5D&exclude=%5B%5D&fansub=619)

![home](./assets/home.png)

## API Usage

```bash
curl "https://garden.onekuma.cn/api/resources?page=1&count=1"
```

You can find more API usage example in [scripts/api.http](./scripts/api.http).

If you are using JavaScript, you can just use the API wrapper `fetchResources` and `fetchResourceDetail` in package [animegarden](https://www.npmjs.com/package/animegarden).

## Packages

### animegarden

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)

A scraper for [動漫花園](https://share.dmhy.org/).

```ts
import { fetchDmhyPage, fetchResources } from 'animegarden'

// Fetch the first page of 動漫花園
const dmhy = await fetchDmhyPage(fetch)

// Fetch the first page of Anime Garden mirror site
const resources = await fetchResources(fetch)

// Fetch all the resources which match some filter conditions
const sakurato = await fetchResources(fetch, { count: -1, fansub: 619 })
```

You can check more conditions [here](https://github.com/yjl9903/AnimeGarden/blob/main/packages/animegarden/src/garden.ts).

### anitomy

[![version](https://img.shields.io/npm/v/anitomy?label=anitomy)](https://www.npmjs.com/package/anitomy)

A TypeScript port of [Anitomy](https://github.com/erengy/anitomy) inspired by [AnitomySharp](https://github.com/tabratton/AnitomySharp) with more optimization for [動漫花園](https://share.dmhy.org/).

```ts
import { parse } from 'anitomy'

const info = parse(`[Lilith-Raws] 熊熊勇闖異世界 PUNCH！ / Kuma Kuma Kuma Bear S02 - 02 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]`)
```

```js
{
  "audio": {
    "term": "AAC",
  },
  "episode": {
    "number": 2,
    "numberAlt": undefined,
    "title": undefined,
  },
  "file": {
    "checksum": undefined,
    "extension": "MP4",
    "name": "[Lilith-Raws] 熊熊勇闖異世界 PUNCH！ / Kuma Kuma Kuma Bear S02 - 02 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]",
  },
  "language": "CHT",
  "month": undefined,
  "release": {
    "group": "Lilith-Raws",
    "version": undefined,
  },
  "season": "2",
  "source": "WEB-DL",
  "subtitles": undefined,
  "title": "熊熊勇闖異世界 PUNCH！ / Kuma Kuma Kuma Bear S02",
  "type": undefined,
  "video": {
    "resolution": "1080p",
    "term": "AVC",
  },
  "volume": {
    "number": undefined,
  },
  "year": undefined,
}
```

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
