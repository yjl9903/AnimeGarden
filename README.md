# 🌸 AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)
[![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

動漫花園 3-rd party [mirror site](https://garden.onekuma.cn).

+ ☁️ Provide [API endpoint](https://garden.onekuma.cn/docs/api) for developers
+ 📺 View [bangumi onair calendar](https://garden.onekuma.cn/anime) to find your favourite anime easily
+ 🔖 Support Advanced search, i.e. `【我推的孩子】 fansub:桜都字幕组 include:简日内嵌`
+ 📙 Generate RSS feed, i.e. [【我推的孩子】](https://garden.onekuma.cn/feed.xml?filter=[{%22fansubId%22:[619],%22search%22:[%22%E3%80%90%E6%88%91%E6%8E%A8%E7%9A%84%E5%AD%A9%E5%AD%90%E3%80%91%22],%22include%22:[[%22%E7%AE%80%E6%97%A5%E5%86%85%E5%B5%8C%22]],%22exclude%22:[]}])
+ 👷‍♂️ First-class support for [AnimeSpace](https://github.com/yjl9903/AnimeSpace) (Still work in progress)

![home](./assets/home.png)

## API Usage

```bash
curl "https://garden.onekuma.cn/api/resources?page=1&pageSize=10"
```

You can find the interactive Open API document [here](https://garden.onekuma.cn/docs/api) and more API usage example in [scripts/api.http](./scripts/api.http).

If you are using JavaScript / TypeScript, you can just use the API wrapper `fetchResources` and `fetchResourceDetail` in package [animegarden](https://www.npmjs.com/package/animegarden).

## Package Usage

A scraper for [動漫花園](https://share.dmhy.org/).

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

MIT License © 2023 [XLor](https://github.com/yjl9903)
