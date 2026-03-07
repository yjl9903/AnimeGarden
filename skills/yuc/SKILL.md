---
name: yuc
description: Scrape quarterly anime lineups from https://yuc.wiki/ and output structured results for a specified or latest quarter.
metadata:
  author: yjl9903
  version: "2026.03.07"
---

# Yuc's Anime List Scraper

## Overview

`yuc.wiki` is a seasonal anime information site that publishes quarter-based lineup pages (January, April, July, October). Each quarter page contains grouped airing entries (Mon-Sun and web-release sections), with title cards, time/status notes, episode hints, and platform links.

This skill resolves the requested quarter (or discovers the latest one), scrapes the lineup section into structured JSON, and validates output quality with deduplication and count checks. It is designed for reliable quarterly lineup extraction, not full editorial article parsing.

## Input

This workflow supports two input modes:

1. Specific quarter: `YYYYMM`, where `MM` must be `01/04/07/10`.
2. Latest quarter: if no quarter is provided, auto-discover from the homepage.

## References

This skill keeps two references:

1. Reference script: `scripts/scrape_lineup.py`
   - Purpose: primary and default extraction path for most requests.
   - Use when: normal runs where deterministic JSON output is expected quickly.
2. Manual scrape guide: `reference/manual_scrape.md`
   - Purpose: fallback process for manual extraction and troubleshooting.
   - Use when: the user explicitly asks for manual scraping, or the script fails / produces suspicious output.

Default policy: use the reference script first. Switch to the manual scrape guide only on explicit request or script issues.

## Post-Processing Output Requirement

After the scraping process is completed (regardless of using the reference script or the manual workflow), do not stop at raw JSON output.

- You must organize and present a human-readable seasonal airing table.
- The table should be grouped by `group` (for example: Mon-Sun and `网络放送 & 其他`), and include at least:
  - title
  - status/time
  - episode note
- Keep the readable table concise, and include source quarter information (`quarter_code` and `quarter_title`).

## Runtime & Safety Notes

- No external binaries are required for the default flow; script and manual quarter discovery use Python standard library only.
- No environment variables or credentials are required by this skill.
- Network scope is limited to public pages on `https://yuc.wiki/` (homepage + target quarter page).
