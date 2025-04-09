# 🌸 Anime Garden Client

[![version](https://img.shields.io/npm/v/@animegarden/client?label=@animegarden/client)](https://www.npmjs.com/package/@animegarden/client)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://animes.garden)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

[AnimeGarden](https://animes.garden/) API client and utils.

## Installation

```bash
npm i @animegarden/client
```

## Usage

```ts
import { fetchResources } from '@animegarden/client'

// Fetch the first page of Anime Garden mirror site
const resources = await fetchResources(fetch)

// Fetch all the resources which match some filter conditions
const sakurato = await fetchResources(fetch, { count: -1, fansub: 619 })
```

Assume your environment has built-in [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch). If not you can use [undici](https://github.com/nodejs/undici) or [ofetch](https://github.com/unjs/ofetch).

You can check more filter conditions [FilterOptions](https://github.com/yjl9903/AnimeGarden/blob/main/packages/animegarden/src/garden/types.ts) and usage examples in [./scripts/](https://github.com/yjl9903/AnimeGarden/blob/main/scripts/) directory.

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)

## License

AGPL-3.0 License © 2025 [XLor](https://github.com/yjl9903)
