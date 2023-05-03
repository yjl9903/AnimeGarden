# 🌸 AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?color=rgb%2850%2C203%2C86%29&label=animegarden)](https://www.npmjs.com/package/animegarden) [![version](https://img.shields.io/npm/v/anitomy?color=rgb%2850%2C203%2C86%29&label=anitomy)](https://www.npmjs.com/package/anitomy) [![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml) [![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml) [![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)

動漫花園 3-rd party [mirror site](https://garden.onekuma.cn) and [API endpoint](https://garden.onekuma.cn/api/resources).

![home](./assets/home.png)

## API Usage

```bash
curl https://garden.onekuma.cn/api/resources?page=1&count=1
```

You can find more API usage example in [scripts/api.http](./scripts/api.http).

If you are using JavaScript, you can just use the API wrapper `fetchResources` and `fetchResourceDetail` in package [animegarden](https://www.npmjs.com/package/animegarden).

## Packages

### animegarden

[![version](https://img.shields.io/npm/v/animegarden?color=rgb%2850%2C203%2C86%29&label=animegarden)](https://www.npmjs.com/package/animegarden)

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

[![version](https://img.shields.io/npm/v/anitomy?color=rgb%2850%2C203%2C86%29&label=anitomy)](https://www.npmjs.com/package/anitomy)

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
