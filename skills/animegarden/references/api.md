# Anime Garden HTTP API Reference

## Base URL

- `https://api.animes.garden`

## Response Conventions

- Success responses usually include `status: "OK"`.
- Error responses usually include `status: "ERROR"` and `message`.

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
    - `keywords`: Required keywords that must be present.
    - `exclude`: Blocked keywords; matched resources are removed.
    - `type`: Resource category filter (for example: animation, collection, music).
    - `subject`: Bangumi subject ID filter.
    - `fansub`: Fansub team name filter.
    - `publisher`: Publisher/uploader name filter.
    - `tracker`: Include magnet tracker value in returned resources.
    - `metadata`: Include parsed metadata (for example, `anipar`) in returned resources.
- Response:
  - `200` `ResourcesResponse`:
    - `status`, `complete`, `resources[]`, `pagination`, `filter`, `timestamp`.
- Example:

  ```bash
  curl 'https://api.animes.garden/resources?search=%E8%91%AC%E9%80%81%E7%9A%84%E8%8A%99%E8%8E%89%E8%8E%B2&keywords=1080p&keywords=%E7%AE%80%E4%BD%93%E5%86%85%E5%B5%8C&type=%E5%8A%A8%E7%94%BB&page=1&pageSize=30'
  ```

### POST /resources

- Function:
  - Search resources using JSON body (better for complex filters).
- Parameters:
  - Query: `tracker`, `metadata`.
  - Body (`ResourcesRequest`):
    - `page`, `pageSize`: Same meaning as GET.
    - `after`, `before`: Same meaning as GET.
    - `search`, `include`, `keywords`, `exclude`: Same meaning as GET.
    - `type`/`types`: Single or multiple resource categories.
    - `subject`/`subjects`: Single or multiple Bangumi subject IDs.
    - `fansub`/`fansubs`: Single or multiple fansub team names.
    - `publisher`/`publishers`: Single or multiple publisher names.
- Response:
  - `200` `ResourcesResponse`.
- Example:

  ```bash
  curl -X POST 'https://api.animes.garden/resources?tracker=true&metadata=false' \
    -H 'Content-Type: application/json' \
    -d '{
      "search": ["葬送的芙莉莲"],
      "keywords": ["1080p", "简体内嵌"],
      "types": ["动画"],
      "after": "2026-02-01T00:00:00.000Z",
      "page": 1,
      "pageSize": 30
    }'
  ```

### GET /detail/{provider}/{id}

- Function:
  - Get full detail for one resource.
- Parameters:
  - Path:
    - `provider` (`dmhy` | `moe` | `ani`)
    - `id` (provider-side resource ID string)
- Response:
  - `200` object with `status`, `detail`, `timestamp`.
  - `detail` is `ResourceDetail` with `description`, `files[]`, `magnets[]`, `hasMoreFiles`.
  - `400` `ErrorResponse` when not found.
- Example:

  ```bash
  curl 'https://api.animes.garden/detail/dmhy/123456'
  ```

## 3. Metadata APIs

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
- `provider` values are limited to `dmhy`, `moe`, and `ani`.
- For resource detail lookups, handle `400` errors as invalid/not-found input.
