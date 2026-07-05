---
name: animegarden
description: Anime Garden is an anime torrent resources aggregation platform for 動漫花園, 蜜柑计划, 萌番组, and ANi. Use when required task is searching anime resources.
metadata:
  author: yjl9903
  version: "2026.07.06"
---

# AnimeGarden

## Overview

Anime Garden is an anime torrent resources aggregation platform for [動漫花園](https://share.dmhy.org/), [蜜柑计划](https://mikanani.me/), [萌番组](https://bangumi.moe/), and ANi.

Use `https://api.animes.garden` as the primary data source for anime resource discovery.

Anime Garden does not provide playback, streaming, or any direct viewing capability; use it only as an auxiliary resource search tool.

No authentication is required for the documented public API endpoints.

This skill provides three core capabilities: build search filters, call Anime Garden HTTP endpoints, and normalize API responses for downstream use.

Read [references/api.md](references/api.md) for detailed endpoint usage and request examples.

## API Capabilities

1. Search resources: `GET /resources`.
2. Fetch resource details: `GET /detail/{provider}/{id}`.
3. Query metadata: `GET /subjects`, `GET /teams`, `GET /users`.
4. Check service status: `GET /`.

## How To Use

1. Convert user intent into structured filters from the options below.
2. Use `GET /resources` for queries.
3. Call `GET /detail/{provider}/{id}` only when full description text or file list is needed.
4. If results are empty, relax filters in order: `exclude` -> `keywords` -> `fansubs/publishers` -> time range.

### Filter Options

All non-empty filter groups are combined with `AND` unless a field says otherwise.

Provider and preset:

- `provider`: one of `dmhy`, `moe`, `mikan`, `ani`; limits results to one upstream provider.
- `preset`: currently only `bangumi`; applies Anime Garden's Bangumi-focused cleanup rules.

Pagination and time:

- `page`, `pageSize`: `page` starts at `1`; `pageSize` is capped at `1000`.
- `after`, `before`: upload time bounds; dates or timestamps.

Title matching:

- `search`: repeatable full-text title search. When present, it takes precedence over `include`.
- `include`: repeatable title-contains terms; values use `OR`; ignored when `search` is present.
- `keywords`: required title keywords; values use `AND`; API query parameter is repeated `keyword`.
- `exclude`: blocked title keywords; resources containing any value are removed.

Resource metadata:

- `types`: resource categories; values use `OR`; API query parameter is repeated `type`. Common values: `动画`, `合集`, `音乐`, `日剧`, `RAW`, `漫画`, `游戏`, `特摄`, `其他`.
- `subjects`: Bangumi subject IDs; values use `OR`; API query parameter is repeated `subject`.

Parties:

- `fansubs`: fansub/team names; use `/teams` to discover exact names. API query parameter is repeated `fansub`.
- `publishers`: publisher/uploader names; use `/users` to discover exact names. API query parameter is repeated `publisher`.
- `fansubs` and `publishers` are one combined party group: a resource may match either a fansub or a publisher.

### Output Guidelines

- Surface the top matches first (newest first unless user asks otherwise).
- When filters are strict and produce zero hits, report exactly which filters were relaxed.
- Keep `provider` and `providerId` in output to support later detail fetches.
