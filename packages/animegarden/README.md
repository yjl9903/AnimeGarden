# AnimeGarden

[![version](https://img.shields.io/npm/v/animegarden?color=rgb%2850%2C203%2C86%29&label=animegarden)](https://www.npmjs.com/package/animegarden) [![version](https://img.shields.io/npm/v/anitomy?color=rgb%2850%2C203%2C86%29&label=anitomy)](https://www.npmjs.com/package/anitomy) [![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml) [![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml) [![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)

A scraper for [動漫花園](https://share.dmhy.org/).

## Installation

```bash
npm i animegarden
```

## Usage

```ts
import { fetchPage } from 'animegarden'

// Fetch the first list page of 動漫花園
const resources = await fetchPage();
```

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
