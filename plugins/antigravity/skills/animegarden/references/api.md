# Anime Garden HTTP API Reference

## Base URL

- `https://api.animes.garden`

## Authentication

No authentication is required for the public endpoints documented here.

## Response Conventions

- Success responses usually include `status: "OK"`.
- Error responses usually include `status: "ERROR"` and `message`.
- Resource lists keep pagination in `pagination: { page, pageSize, complete }`.
  `page` starts at `1`; `pageSize` is the requested page size, and the returned list may be shorter.
  `complete: true` only means no matching resources follow the current page. It does not confirm
  that the caller fetched previous pages.

## 1. Status API

### GET /

- Function:
  - Get API status, current timestamp, and upstream provider health.
- Parameters:
  - None.
- Response:
  - `200` object with `message`, `timestamp`, `providers`.
- Example:

  ```bash
  curl 'https://api.animes.garden/'
  ```

## 2. Resource APIs

### GET /resources

- Function:
  - Search resources with query-string filters.
- Parameters:
  - Query:
    - `page`: Page number (starts from `1`).
    - `pageSize`: Number of resources per page.
    - `after`: Lower time bound; keep resources created at or after this datetime.
    - `before`: Upper time bound; keep resources created at or before this datetime.
    - `search`: Full-text search terms for title/content matching.
    - `include`: Title-contains terms, used as a lighter alternative to `search`.
    - `keyword`: Required keyword; repeat this query parameter for multiple required terms.
    - `exclude`: Blocked keywords; matched resources are removed.
    - `type`: Resource category filter (for example: animation, collection, music).
    - `subject`: Bangumi subject ID filter.
    - `fansub`: Fansub team name filter.
    - `publisher`: Publisher/uploader name filter.
    - `tracker`: Include magnet tracker value in returned resources.
    - `metadata`: Include parsed metadata (for example, `anipar`) in returned resources.
- Response:
  - `200` `ResourcesResponse`:
    - `status`, `resources[]`, `pagination`, `filter`, `timestamp`.
    - `pagination`: `{ page: number, pageSize: number, complete: boolean }`.
    - There is no top-level `complete` field.
- Example:

  ```bash
  curl 'https://api.animes.garden/resources?search=%E8%91%AC%E9%80%81%E7%9A%84%E8%8A%99%E8%8E%89%E8%8E%B2&keyword=1080p&keyword=%E7%AE%80%E4%BD%93%E5%86%85%E5%B5%8C&type=%E5%8A%A8%E7%94%BB&page=1&pageSize=30'
  ```

### GET /detail/{provider}/{id}

- Function:
  - Get full detail for one resource.
- Parameters:
  - Path:
    - `provider` (`dmhy` | `moe` | `mikan` | `ani`)
    - `id` (provider-side resource ID string)
- Response:
  - `200` object with `status`, `detail`, `timestamp`.
  - `detail` is `ResourceDetail` with `description`, `files[]`, `magnets[]`, `hasMoreFiles`.
  - `400` `ErrorResponse` when not found.
- Example:

  ```bash
  curl 'https://api.animes.garden/detail/dmhy/123456'
  ```

### GET /detail/infohash/{hash}

- Function:
  - Get resource and detail by torrent info hash.
- Parameters:
  - Path: `hash` (40-character hex info hash or 32-character base32 info hash)
- Response:
  - `200` object with `status`, `resource`, `detail`, `timestamp`.
  - Invalid or unknown hashes return `status: "ERROR"`.

## 3. Collection API

### GET /collection/{hash}

- Function:
  - Get the collection and the first resource page for each saved filter.
- Parameters:
  - Path: `hash` (collection hash).
  - No `page` or `pageSize` parameters are supported by this endpoint.
- Response:
  - `200` object with `status`, `hash`, `name`, `createdAt`, `filters[]`, and `results[]`.
  - Each `results[i]` corresponds to `filters[i]` and contains:
    - `resources[]`.
    - `pagination`: `{ page: 1, pageSize: 1000, complete: boolean }`.
    - `filter`: resolved resource query filters.
  - There is no sibling `results[i].complete` field.
- More resources:
  - When `results[i].pagination.complete` is `false`, query `/resources` with the corresponding
    `filters[i].searchParams`, the next `page`, and the same `pageSize`.
  - Collection queries still return page `1`, with at most `1000` resources per filter.

### Pagination migration

The old completion fields are removed without aliases:

| Old response path                                  | New response path                       |
| -------------------------------------------------- | --------------------------------------- |
| `/resources`: `result.complete`                    | `result.pagination.complete`            |
| `/collection/{hash}`: `result.results[i].complete` | `result.results[i].pagination.complete` |

The SDK also exposes `pagination` for resource and collection query results. Update consumers,
fixtures, and assertions to read all pagination fields from this object.

## 4. Metadata APIs

### GET /users

- Function:
  - List publishers/users.
- Parameters:
  - None.
- Response:
  - `200` object with `status`, `users[]`.
  - `users[]` item fields include: `id`, `provider`, `providerId`, `name`, `avatar`.
- Example:

  ```bash
  curl 'https://api.animes.garden/users'
  ```

### GET /teams

- Function:
  - List fansub teams.
- Parameters:
  - None.
- Response:
  - `200` object with `status`, `teams[]`.
  - `teams[]` item fields include: `id`, `provider`, `providerId`, `name`, `avatar`.
- Example:

  ```bash
  curl 'https://api.animes.garden/teams'
  ```

### GET /subjects

- Function:
  - List anime subjects (Bangumi IDs and metadata).
- Parameters:
  - None.
- Response:
  - `200` object with `status`, `subjects[]`.
  - `subjects[]` item fields include: `id`, `name`, `keywords[]`, `activedAt`, `isArchived`.
- Example:

  ```bash
  curl 'https://api.animes.garden/subjects'
  ```

## Notes

- Query Semantics (Important):
  - Different query groups are combined with `AND`.
  - Multi-value fields like `fansub(s)`, `publisher(s)`, `type(s)`, `subject(s)`, and `include` behave like `OR` within the same field.
  - `search` has higher priority than `include`; when both are provided, `search` is used.
  - `keywords` are required terms (`AND` semantics).
  - `exclude` are blocked terms; matched items are filtered out.
- `search` has higher priority than `include` in the project resolver logic.
- `provider` values are limited to `dmhy`, `moe`, `mikan`, and `ani`.
- For resource detail lookups, handle `400` errors as invalid/not-found input.
