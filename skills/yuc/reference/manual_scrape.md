# Manual Scrape Guide

## Scrape Workflow

1. Resolve the target quarter.
2. Fetch the quarter page HTML.
3. Parse only the lineup section, and skip the long-form section after `<!--新番介绍部分-->`.
4. Extract title, weekday group, status/time, episode note, platforms, and cover image for each entry.
5. Output structured JSON and run integrity checks.

## Quarter Discovery

If quarter is not specified, request `https://yuc.wiki/` and extract `/<YYYYMM>/` links.

Recommended command:

```bash
python3 - <<'PY'
import re
from urllib.request import urlopen

homepage = urlopen("https://yuc.wiki/").read().decode("utf-8", errors="ignore")
quarters = sorted(
    {
        m
        for m in re.findall(r"/(20\d{4})/", homepage)
        if re.fullmatch(r"20\d{2}(01|04|07|10)", m)
    }
)
if not quarters:
    raise SystemExit("No quarter links found on homepage")
print(quarters[-1])
PY
```

Prefer quarter URL `https://yuc.wiki/YYYYMM/`; fallback to `https://yuc.wiki/YYYYMM`.

## Parsing Rules

The site is Hexo-based. Main content containers:

- `article.post-block`
- `.post-body[itemprop="articleBody"]`

Parse only from the first `td.date2` (for example `周一 (月)`) until before `<!--新番介绍部分-->`.

### Group Extraction

- Group header selector: `td.date2`
- Example values: `周一 (月)`, `周日 (日)`, `网络放送 & 其他`
- Keep `current_group` and assign it to following entries.

### Item Extraction

Common entry container patterns:

- Outer wrapper is often `div[style*="float:left"]`
- Title is in `td[class^="date_title"]` (for example `date_title_`, `date_title1`, `date_title__`)
- Regular entry meta block: `.div_date`
- Web-release entry meta block: `.div_date_` + `tr.tr_area_ex`

Extract fields:

- `title`: plain text from `td[class^="date_title"]` (collapse `<br>` into spaces)
- `status_or_time`: first `<p>` in the meta block (for example `22:00~`, `完结`, `暂完`)
- `episode_note`: second `<p>` in the meta block (usually `.imgep`)
- `cover_url`: main cover image, prefer `img[data-src]`, fallback `img[src]`
- `platforms`: list from `tr.tr_area td a`
- `platforms[].name`: text from `p.area` / `p.area_c` / `p.area_ex`
- `platforms[].url`: `a[href]`
- `extra_note`: text in `tr.tr_area_ex` (for example `10/2起网络放送`)
- `group`: current group text (weekday or web-release group)

Notes:

- Platform icons and cover images are lazy-loaded. Always prefer `data-src`.
- Some entries may have no platform links (copyright/region rows removed). Allow empty `platforms`.

## Output Schema

Output must be JSON:

```json
{
  "source": "https://yuc.wiki/202601/",
  "quarter_code": "202601",
  "quarter_title": "2026年1月新番表",
  "items": [
    {
      "title": "Sample Anime Title",
      "group": "周一 (月)",
      "status_or_time": "21:00~",
      "episode_note": "(全12话)",
      "cover_url": "http://...",
      "platforms": [
        { "name": "大陆", "url": "https://www.bilibili.com/..." }
      ],
      "extra_note": ""
    }
  ]
}
```

## Quality Checks

Run these checks after scraping:

1. `quarter_title` must match `\d{4}年(1|4|7|10)月新番表`.
2. `items` must not be empty.
3. Deduplicate by `title + group` inside the same group.
4. If page contains `共收录 N 部新番动画`, compare `N` with deduplicated item count and flag large mismatch as potential layout drift.

## Fallback Strategy

If primary selectors break due to layout changes:

1. Relax title selector to `td[class*="date_title"]`.
2. Extract platforms from `tr.tr_area a` without relying on `p.area*` class names.
3. If still failing, return `quarter_title` plus source URL and explicitly report layout change requiring selector updates.

## Operating Constraints

1. Scrape only public pages. Do not log in or bypass restrictions.
2. In one run, request only required pages (homepage once + quarter page once).
3. Keep original source URLs in output for traceability.
