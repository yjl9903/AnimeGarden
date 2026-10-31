# 🌸 Anime Garden Client

[![version](https://img.shields.io/npm/v/@animegarden/client?label=@animegarden/client)](https://www.npmjs.com/package/@animegarden/client)
[![CI](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/AnimeGarden/actions/workflows/ci.yml)

A JavaScript / TypeScript API client for [AnimeGarden](https://animes.garden).

## Installation

> Requires Node.js 24+ or a browser with the standard Fetch API.

```bash
npm i @animegarden/client
```

## Usage

Example:

```ts
import { fetchResources } from '@animegarden/client';

// Fetch the first batch of resources
const result = await fetchResources();
if (!result.ok) {
  throw result.error;
}

console.log(result.resources);

// Fetch matching resources across cursor batches
const botan = await fetchResources({
  count: -1,
  subject: 543360,
  fansub: '喵萌奶茶屋',
  keywords: ['简日']
});

if (!botan.ok) {
  throw botan.error;
}

console.log(botan.resources);
```

See [./examples/](https://github.com/yjl9903/AnimeGarden/blob/main/examples/) for more code examples.

Common filters (combined with AND):

| Field | Matching rule |
| --- | --- |
| `subjects` | Match any of the specified Bangumi subject IDs. |
| `fansubs` / `publishers` | Filter by fansub or publisher names, respectively. Match any name; when both are set, either condition suffices. |
| `search` | Search titles by anime name or keywords. Overrides `include`. |
| `include` | The title contains any of the specified terms; useful for searching by anime name. |
| `keywords` | The title contains every specified term, such as `['1080p', '简日']`. |
| `exclude` | Exclude resources whose titles contain any specified term. |
| `after` / `before` | Limit publication dates to an inclusive range. |

A successful `fetchResources()` result contains these fields:

| Field | Meaning |
| --- | --- |
| `ok` | `true` if the request succeeded. |
| `resources` | Matching resources, deduplicated and sorted from newest to oldest. |
| `pagination` | Query version `anchor` in Unix milliseconds, batch `limit`, opaque `nextCursor`, and `complete` (true when nextCursor is null). |
| `filter` | The filters actually used by the server after parsing. |
| `timestamp` | The provider data version from the first successful response. |

## Credits

+ [動漫花園](https://share.dmhy.org/)
+ [蜜柑计划](https://mikanani.me/)
+ [萌番组](https://bangumi.moe/)
+ [Bangumi 番组计划](https://bgm.tv/)
+ [bangumi-data](https://github.com/bangumi-data/bangumi-data)

## License

AGPL-3.0 License © 2025 [XLor](https://github.com/yjl9903)
