#!/usr/bin/env python3
import argparse
import html
import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


def clean_text(text: str, br_to_space: bool = True) -> str:
    if text is None:
        return ""
    if br_to_space:
        text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fetch_text(url: str) -> str:
    with urlopen(url) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def discover_latest_quarter() -> str:
    homepage = fetch_text("https://yuc.wiki/")
    quarters = sorted(
        {
            m
            for m in re.findall(r"/(20\d{4})/", homepage)
            if re.fullmatch(r"20\d{2}(01|04|07|10)", m)
        }
    )
    if not quarters:
        raise RuntimeError("failed to discover latest quarter from homepage links")
    return quarters[-1]


def parse_yuc_quarter(quarter_code: str, page_html: str) -> dict:
    source = f"https://yuc.wiki/{quarter_code}/"

    m_title = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', page_html)
    if not m_title:
        m_title = re.search(r'<h1 class="post-title"[^>]*>(.*?)</h1>', page_html, flags=re.S)
    quarter_title = clean_text(m_title.group(1), br_to_space=True) if m_title else ""

    start = page_html.find('<td class="date2">')
    end = page_html.find("<!--新番介绍部分-->")
    section = page_html[start:end] if (start != -1 and end != -1 and start < end) else page_html

    headers = list(re.finditer(r'<td class="date2">(.*?)</td>', section, flags=re.S))
    items = []

    for idx, hm in enumerate(headers):
        group = clean_text(hm.group(1))
        chunk_start = hm.end()
        chunk_end = headers[idx + 1].start() if idx + 1 < len(headers) else len(section)
        chunk = section[chunk_start:chunk_end]

        pattern = (
            r'<div style="float:left[^"]*">\s*'
            r'<div class="(div_date_?)">(.*?)</div>\s*'
            r"<div><table[^>]*>(.*?)</table></div></div>"
        )
        for em in re.finditer(pattern, chunk, flags=re.S):
            _meta_class, meta_html, table_html = em.groups()

            tm = re.search(r'<td[^>]*class="date_title[^"]*"[^>]*>(.*?)</td>', table_html, flags=re.S)
            if not tm:
                tm = re.search(r'<td[^>]*class="[^"]*date_title[^"]*"[^>]*>(.*?)</td>', table_html, flags=re.S)
            if not tm:
                continue

            title = clean_text(tm.group(1), br_to_space=True)
            if not title:
                continue

            p_texts = [clean_text(x, br_to_space=True) for x in re.findall(r"<p[^>]*>(.*?)</p>", meta_html, flags=re.S)]
            p_texts = [x for x in p_texts if x]

            extra_note = ""
            ex_p_texts = []
            ex = re.search(r'<tr class="tr_area_ex"><td[^>]*>(.*?)</td>\s*</tr>', table_html, flags=re.S)
            if ex:
                ex_inner = ex.group(1)
                extra_note = clean_text(ex_inner, br_to_space=True)
                ex_p_texts = [clean_text(x, br_to_space=True) for x in re.findall(r"<p[^>]*>(.*?)</p>", ex_inner, flags=re.S)]
                ex_p_texts = [x for x in ex_p_texts if x]

            status_or_time = p_texts[0] if len(p_texts) >= 1 else (ex_p_texts[0] if len(ex_p_texts) >= 1 else "")
            episode_note = p_texts[1] if len(p_texts) >= 2 else (ex_p_texts[1] if len(ex_p_texts) >= 2 else "")

            m_cover = re.search(r'<img[^>]*data-src="([^"]+)"', meta_html, flags=re.S)
            if not m_cover:
                m_cover = re.search(r'<img[^>]*src="([^"]+)"', meta_html, flags=re.S)
            cover_url = html.unescape(m_cover.group(1)).strip() if m_cover else ""

            platforms = []
            seen_pf = set()
            for row in re.findall(r'<tr class="tr_area">(.*?)</tr>', table_html, flags=re.S):
                for am in re.finditer(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', row, flags=re.S):
                    url, inner = am.groups()
                    nm = re.search(r'<p[^>]*class="(?:area|area_c|area_ex)"[^>]*>(.*?)</p>', inner, flags=re.S)
                    name = clean_text(nm.group(1)) if nm else clean_text(inner)
                    url = html.unescape(url).strip()
                    key = (name, url)
                    if not url or key in seen_pf:
                        continue
                    seen_pf.add(key)
                    platforms.append({"name": name, "url": url})

            items.append(
                {
                    "title": title,
                    "group": group,
                    "status_or_time": status_or_time,
                    "episode_note": episode_note,
                    "cover_url": cover_url,
                    "platforms": platforms,
                    "extra_note": extra_note,
                }
            )

    dedup = []
    seen = set()
    for item in items:
        key = (item["title"], item["group"])
        if key in seen:
            continue
        seen.add(key)
        dedup.append(item)

    title_ok = bool(re.search(r"^\d{4}年(?:1|4|7|10)月新番表$", quarter_title))
    if not title_ok:
        print(f"[WARN] quarter_title format mismatch: {quarter_title}", file=sys.stderr)
    if not dedup:
        raise RuntimeError("items is empty")

    m_n = re.search(r"共收录\s*<font[^>]*>\s*<b>\s*<u>(\d+)</u>", page_html, flags=re.S)
    if m_n:
        claimed = int(m_n.group(1))
        diff = abs(len(dedup) - claimed)
        if diff >= 5:
            print(
                f"[WARN] count mismatch may indicate layout drift: "
                f"claimed={claimed}, parsed={len(dedup)}, diff={diff}",
                file=sys.stderr,
            )

    return {
        "source": source,
        "quarter_code": quarter_code,
        "quarter_title": quarter_title,
        "items": dedup,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape seasonal anime lineup from yuc.wiki")
    parser.add_argument("--quarter", help="Quarter code like 202601/202604/202607/202610")
    parser.add_argument("--output", default="-", help="Output JSON path, or - for stdout")
    args = parser.parse_args()

    quarter = args.quarter or discover_latest_quarter()
    if not re.fullmatch(r"20\d{2}(01|04|07|10)", quarter):
        raise SystemExit(f"invalid quarter: {quarter}")

    urls = [f"https://yuc.wiki/{quarter}/", f"https://yuc.wiki/{quarter}"]
    page_html = None
    last_err = None
    for url in urls:
        try:
            page_html = fetch_text(url)
            break
        except (HTTPError, URLError) as err:
            last_err = err
    if page_html is None:
        raise RuntimeError(f"failed to fetch quarter page: {last_err}")

    result = parse_yuc_quarter(quarter, page_html)
    output = json.dumps(result, ensure_ascii=False, indent=2)

    if args.output == "-":
        print(output)
    else:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
