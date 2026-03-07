---
name: animegarden
description: Anime Garden is a anime torrent resources aggregation platform, which is also a third-party mirror of 動漫花園, 萌番组, and ANi. Use when required task is searching anime resources.
metadata:
  author: yjl9903
  version: "2026.03.07"
---

# AnimeGarden

## Overview

Anime Garden is a anime torrent resources aggregation platform, which is also a third-party mirror of [動漫花園](https://share.dmhy.org/), [萌番组](https://bangumi.moe/), and ANi.

Use `https://api.animes.garden` as the primary data source for anime resource discovery.

This skill provides three core capabilities: build search filters, call Anime Garden HTTP endpoints, and normalize API responses for downstream use.

Read [references/api.md](references/api.md) for detailed endpoint usage and request examples.

## API Capabilities

1. Search resources: `GET /resources` or `POST /resources`.
2. Fetch resource details: `GET /detail/{provider}/{id}`.
3. Query metadata: `GET /subjects`, `GET /teams`, `GET /users`.
4. Check service status: `GET /`.

## How To Use

1. Convert user intent into structured filters: `search/include/keywords/exclude/types/fansubs/publishers/subjects/after/before`.
2. Use `GET /resources` for simple queries; use `POST /resources` for complex filter combinations.
3. Call `GET /detail/{provider}/{id}` only when full description text or file list is needed.
4. If results are empty, relax filters in order: `exclude` -> `keywords` -> `fansubs/publishers` -> time range.

## Filter Semantics

Apply these rules when constructing requests:

- Different filter groups use `AND`.
- Values within `fansubs/publishers/types/subjects/include` use `OR`.
- `search` takes precedence over `include`.
- `keywords` are treated as required terms (`AND`).
- `exclude` values are treated as blocked terms.

## Output Guidelines

- Surface the top matches first (newest first unless user asks otherwise).
- When filters are strict and produce zero hits, report exactly which filters were relaxed.
- Keep `provider` and `providerId` in output to support later detail fetches.
