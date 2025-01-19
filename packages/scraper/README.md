# 🌸 AnimeGarden Scraper

[![version](https://img.shields.io/npm/v/@animegarden/scraper?label=@animegarden/scraper)](https://www.npmjs.com/package/@animegarden/scraper)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.breadio.wiki)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

Scraper for [AnimeGarden](https://garden.breadio.wiki/).

## Installation

```bash
npm i @animegarden/scraper
```

## Usage

```ts
import { fetchDmhyPage } from '@animegarden/scraper'

// Fetch the first page of 動漫花園
const dmhy = await fetchDmhyPage(fetch)
```

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
