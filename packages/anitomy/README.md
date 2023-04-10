# Anitomy

[![version](https://img.shields.io/npm/v/anitomy?color=rgb%2850%2C203%2C86%29&label=Anitomy)](https://www.npmjs.com/package/anitomy) [![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

A TypeScript port of [Anitomy](https://github.com/erengy/anitomy) inspired by [AnitomySharp](https://github.com/tabratton/AnitomySharp). All credits to [erengy](https://github.com/erengy) for the actual library.

More features:

+ Implemented without any dependencies, which supports run in Node, browser
+ Optimized for parsing chinese torrent name from [動漫花園](https://share.dmhy.org/)

## Installation

```bash
npm i anitomy
```

## Usage

```ts
import { parse } from 'anitomy'

const info = parse(`[Lilith-Raws] 熊熊勇闖異世界 PUNCH！ / Kuma Kuma Kuma Bear S02 - 02 [Baha][WEB-DL][1080p][AVC AAC][CHT][MP4]`)
```

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
