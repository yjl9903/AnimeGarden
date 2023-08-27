# 🌸 AnimeGarden Worker

[![version](https://img.shields.io/npm/v/animegarden?label=animegarden)](https://www.npmjs.com/package/animegarden)
[![version](https://img.shields.io/npm/v/anitomy?label=anitomy)](https://www.npmjs.com/package/anitomy)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)
[![Deploy Worker](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/deploy.yml)
[![AnimeGarden](https://img.shields.io/endpoint?url=https://pages.onekuma.cn/project/animegarden&label=AnimeGarden)](https://garden.onekuma.cn)

動漫花園 3-rd party [API endpoint](https://garden.onekuma.cn/api/resources).

## Developement

Add a new MySQL database in the [PlanetScale](https://planetscale.com/), and create `packages/worker/.dev.vars`.

```env
DATABASE_HOST=...
DATABASE_USERNAME=...
DATABASE_PASSWORD=...
```

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [erengy/anitomy](https://github.com/erengy/anitomy)
+ [tabratton/AnitomySharp](https://github.com/tabratton/AnitomySharp)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
