# 🌸 AnimeGarden Web Application

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![version](https://img.shields.io/npm/v/anitomy?label=anitomy)](https://www.npmjs.com/package/anitomy)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)
[![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)

動漫花園 3-rd party [mirror site](https://garden.onekuma.cn) and [API endpoint](https://garden.onekuma.cn/api/resources).

## API Usage

```bash
curl https://garden.onekuma.cn/api/resources?page=1&count=1
```

## Deploy

+ Astro: in `astro.config.ts`, add the deployed site URL.
+ Cloudflare:
  + Use the same KV namespace (named as `animegarden`) with the worker.
  + Bind the worker service (named as `worker`).

## Local Development

Follow [CONTRIBUTING.md](../../CONTRIBUTING.md#cloudflare-worker) to setup the environment and start developing.

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
