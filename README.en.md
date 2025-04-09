# 🌸 AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://animes.garden)
[![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

[English](/README.en.md) | [简体中文](/README.md)

[動漫花園](https://share.dmhy.org/) 3-rd party [mirror site](https://animes.garden) and [Anime Torrent aggregation site](https://animes.garden).

+ ☁️ Provide [API endpoint](https://animes.garden/docs/api) for developers
+ 📺 View [bangumi onair calendar](https://animes.garden/anime) to find your favourite anime easily
+ 🔖 Support Advanced search, i.e. `葬送的芙莉莲 +简体内嵌 fansub:桜都字幕组 type:动画`
+ 📙 Generate RSS feed, i.e. [葬送的芙莉莲](https://animes.garden/feed.xml?filter=%5B%7B%22fansubId%22:%5B%22619%22%5D,%22type%22:%22%E5%8B%95%E7%95%AB%22,%22include%22:%5B%22%E8%91%AC%E9%80%81%E7%9A%84%E8%8A%99%E8%8E%89%E8%8E%B2%22%5D,%22keywords%22:%5B%22%E7%AE%80%E4%BD%93%E5%86%85%E5%B5%8C%22%5D%7D%5D)
+ ⭐ Bookmark management and generate aggregated RSS feed
+ 👷‍♂️ Support [AutoBangumi](https://www.autobangumi.org/) and [AnimeSpace](https://github.com/yjl9903/AnimeSpace)

![home](./assets/home.png)

## API Usage

```bash
curl "https://animes.garden/api/resources?page=1&pageSize=10"
```

You can find the interactive Open API document [here](https://animes.garden/docs/api) and more API usage example in [scripts/api.http](./scripts/api.http).

If you are using JavaScript / TypeScript, you can just use the API wrapper `fetchResources` and `fetchResourceDetail` in package [animegarden](https://www.npmjs.com/package/animegarden).

## Package Usage

[AnimeGarden](https://animes.garden) API client and utils for JavaScript / TypeScript.

```bash
npm i animegarden
```

```ts
import { fetchResources } from 'animegarden'

// Fetch the first page of Anime Garden mirror site
const resources = await fetchResources(fetch)

// Fetch all the resources which match some filter conditions
const sakurato = await fetchResources(fetch, { count: -1, fansub: 619 })
```

Assume your environment has built-in [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch). If not you can use [undici](https://github.com/nodejs/undici) or [ofetch](https://github.com/unjs/ofetch).

You can check more filter conditions [FilterOptions](https://github.com/yjl9903/AnimeGarden/blob/main/packages/animegarden/src/garden/types.ts) and usage examples in [./scripts/](https://github.com/yjl9903/AnimeGarden/blob/main/scripts/) directory.

## Local Development

Follow [CONTRIBUTING.md](./CONTRIBUTING.md) to setup the environment and start developing.

## Related Projects

+ [AnimeSpace](https://github.com/yjl9903/AnimeSpace): Keep following your favourite anime
+ [Anitomy](https://github.com/yjl9903/anitomy): A TypeScript port of Anitomy inspired by AnitomySharp.
+ [bgmc](https://github.com/yjl9903/bgmc): Bangumi Data / API Clients

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

AGPL-3.0 License © 2023 [XLor](https://github.com/yjl9903)
