# AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://animes.garden)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

API client and utils for [AnimeGarden](https://animes.garden/).

## Installation

```bash
npm i @animegarden/client
```

## Usage

```ts
import { fetchResources } from '@animegarden/client'

// Fetch the first page of Anime Garden mirror site
const resources = await fetchResources()

// Fetch all the resources which match some filter conditions
const sakurato = await fetchResources({ count: -1, fansub: 'ANi' })
```

Assume your environment has built-in [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch). If not you can use [undici](https://github.com/nodejs/undici) or [ofetch](https://github.com/unjs/ofetch).

You can check more filter conditions [FilterOptions](https://github.com/yjl9903/AnimeGarden/blob/main/packages/animegarden/src/garden/types.ts) and usage examples in [./scripts/](https://github.com/yjl9903/AnimeGarden/blob/main/scripts/) directory.

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [萌番组](https://bangumi.moe/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

AGPL-3.0 License © 2023 [XLor](https://github.com/yjl9903)
