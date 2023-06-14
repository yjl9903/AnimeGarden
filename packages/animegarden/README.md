# AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![version](https://img.shields.io/npm/v/anitomy?label=anitomy)](https://www.npmjs.com/package/anitomy)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)
[![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)

A scraper for [動漫花園](https://share.dmhy.org/).

## Installation

```bash
npm i animegarden
```

## Usage

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

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
