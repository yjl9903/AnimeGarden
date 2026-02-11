<<<<<<< HEAD
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
=======
# :tv: AnimeSpace

[![version](https://img.shields.io/npm/v/animespace?label=AnimeSpace)](https://www.npmjs.com/package/animespace)
[![CI](https://github.com/yjl9903/AnimeSpace/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeSpace/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/AnimeSpace-Demo-brightgreen)](https://animespace.onekuma.cn/)
[![License](https://img.shields.io/github/license/yjl9903/AnimeSpace)](./LICENSE)

<p align="center">「 你所热爱的就是你的动画 」</p>

Paste your favourite anime online.

AnimeSpace is yet another complete **solution** for **automatically following bangumis**.

All the bangumi resources are automatically collected and downloaded from [動漫花園](https://share.dmhy.org/). **Sincere thanks to [動漫花園](https://share.dmhy.org/) and all the fansubs.**

+ 📖 [中文文档](https://animespace.onekuma.cn/)
+ 📚 [部署博客](https://blog.onekuma.cn/alidriver-alist-rclone-animepaste)

> **Notice**:
>
> 👷‍♂️ Still work in progress towards v1.0.0.
>
> More docs and out-of-the-box usage will be available in v1.0.0.

## Features

+ :gear: **Automatically** collect, download and organize anime resources
+ :construction_worker_man: **Scrape anime metadata** from [Bangumi 番组计划](https://bangumi.tv/) and generate NFO file (WIP)
+ :film_strip: **Support any media server** including [Infuse](https://firecore.com/infuse), [Plex](https://www.plex.tv/), [Jellyfin](https://github.com/jellyfin/jellyfin), [Kodi](https://kodi.tv/) and so on...

![Jellyfin](./docs/public/Jellyfin.jpeg)

## Installation

> **Prerequisite**
>
> Install latest [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) globally.

See [部署 | AnimeSpace](https://animespace.onekuma.cn/deploy/) and [安装 CLI | AnimeSpace](https://animespace.onekuma.cn/admin/).

## Usage

Work in progress.

## Related Projects

+ [AnimeGarden](https://github.com/yjl9903/AnimeGarden): 動漫花園 3-rd party [mirror site](https://animes.garden/) and API endpoint
+ [bgmd](https://github.com/AnimeGarden/bgmd): Bangumi data
+ [bgmx](https://github.com/yjl9903/bgmx): Bangumi API Clients
+ [naria2](https://github.com/yjl9903/naria2): Convenient BitTorrent Client based on the aria2 JSON-RPC
+ [BreadFS](https://github.com/yjl9903/BreadFS): Unified File System Abstraction
+ [Breadc](https://github.com/yjl9903/Breadc): Yet another Command Line Application Framework with fully TypeScript support

## Credits

+ **[動漫花園](https://share.dmhy.org/) and all the fansubs**
+ [Bangumi 番组计划](https://bangumi.tv/) provides a platform for sharing anything about ACG
+ [Bangumi Data](https://github.com/bangumi-data/bangumi-data) collects the infomation of animes
+ [aria2](https://github.com/aria2/aria2) and [WebTorrent](https://webtorrent.io/) provide the ability to download magnet links
+ [Anime Tracker List](https://github.com/DeSireFire/animeTrackerList) collects trackers for downloading bangumi resources
>>>>>>> c61763ad (chore: move to animespace dir)

## License

AGPL-3.0 License © 2023 [XLor](https://github.com/yjl9903)
