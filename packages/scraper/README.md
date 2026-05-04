# 🌸 Anime Garden Scraper

[![version](https://img.shields.io/npm/v/@animegarden/scraper?label=@animegarden/scraper)](https://www.npmjs.com/package/@animegarden/scraper)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

Scraper for [AnimeGarden](https://animes.garden/).

## Installation

```bash
npm i @animegarden/scraper
```

## Usage

```ts
import { fetchDmhyPage, fetchMoePage, fetchLastestANi } from '@animegarden/scraper'

// Fetch the first page of 動漫花園
const dmhy = await fetchDmhyPage(fetch)

// Fetch the first page of 動漫花園
const moe = await fetchMoePage(fetch)

// Fetch latest ANi
const ani = await fetchLastestANi(fetch)
```

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [蜜柑计划](https://mikanani.me/)
+ [萌番组](https://bangumi.moe/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
