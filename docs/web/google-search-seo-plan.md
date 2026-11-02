# 页面 SEO 与索引规则

Web 的 SEO 由通用 builder、页面配置和路由数据组成。
资源 URL 与分页规则见[资源查询与分页](./resources-pagination.md)。

## 配置分层

| 层次 | 位置 | 职责 |
| --- | --- | --- |
| 通用工具 | `src/utils/seo/` | 站点常量、文案清洗、社交卡片、JSON-LD |
| 页面规则 | `src/pages/*/seo.ts` | 页面标题、描述、canonical、索引判断 |
| 路由 | `src/routes/` | 将 loader 数据与路径参数交给 head builder |
| Markdown | `src/markdown/` | 复用页面 SEO 文案生成 frontmatter |

页面 `build*PageSeo()` 生成标题、描述和分享图数据，
`build*PageHead()` 将其组装为 HTML head。
Markdown frontmatter 使用 title 和可用的 description；
canonical、robots、社交卡片与结构化数据由 HTML 输出。

## 全局站点配置

| 配置 | 值 |
| --- | --- |
| 站点名称 | Anime Garden |
| 首页标题 | Anime Garden 動漫花園第三方镜像站以及动画 BT 资源聚合站 |
| 内页标题 | `{页面标题} \| Anime Garden` |
| 默认描述 | 動漫花園第三方镜像站以及动画 BT 资源聚合站。 |
| 站点地址 | `https://animes.garden/` |
| Logo | `https://animes.garden/pwa-512x512.png` |
| 默认分享图 | `https://animes.garden/twitter.jpg` |
| GitHub | `https://github.com/yjl9903/AnimeGarden` |
| 全局 robots meta | `max-image-preview:large` |
| HTML 语言 | zh-CN |

根路由声明 64×64 ICO/PNG、SVG favicon、180×180 Apple Touch Icon 和 Web App Manifest。
文件位于 public，图标 URL 保持稳定。

## 页面配置

| 页面 | 标题与描述 | Canonical | 索引 |
| --- | --- | --- | --- |
| `/` | 品牌标题与默认描述 | `/` | 允许 |
| `/calendar/:season` | 年份、月份与新番周历文案 | 当前季度 | 允许 |
| `/resources` | 筛选生成的标题与摘要 | 当前筛选；Subject 单筛选指向 Subject | 按筛选白名单 |
| `/subject/:id` | 作品名与上游简介 | 当前 Subject | 允许 |
| `/detail/:provider/:providerId` | 资源标题与详情描述 | 当前详情 | 允许 |
| `/docs/api` | Open API 文档 | `/docs/api` | 允许 |
| `/skills` | Skills/MCP 引导文案 | `/skills` | 允许 |
| `/collection/:hash` | 收藏夹名称与介绍 | 当前收藏夹 | noindex,follow |
| `/iframe` | 复用资源列表文案 | 省略 | noindex,follow |
| `/about` | 关于页面文案 | `/about` | noindex,follow |

canonical 去掉尾斜杠、排序查询参数，并移除 anchor、cursor、limit。
页面筛选 URL 表达内容入口，滚动位置保存在 Query 数据中。

## 资源列表标题与描述

先生成 heading，再追加站点后缀。heading 按以下顺序选择：

1. 可解析的 Subject 名称。
2. search。
3. 第一个 include。
4. 单个 keywords。
5. preset 展示名。
6. 单个字幕组。
7. 单个发布者。
8. 单个类型。
9. 无以上条件时使用“所有资源”。

名称类 heading 使用“{名称} 最新动画资源”，单类型使用“最新{类型}资源”。
单个 Subject、search 或 keywords 与单个字幕组或发布者组合时，
heading 中追加该 party 名称。

无筛选摘要时，description 为：

```text
Anime Garden 动画 BT 资源聚合列表，支持按作品、字幕组、发布者、资源类型和发布时间筛选。
```

有筛选时使用 `{heading}。筛选条件：{摘要}。`，最多 160 字。
摘要依次描述 preset、Subject、类型、发布者、字幕组、来源、search、include、
keywords、exclude、after、before；维度间用中文分号，多值用顿号。

## 资源索引白名单

有效数组字段至少含一个值才构成筛选维度。白名单判断同时检查维度数量和各维度的值数量。

| 条件 | 索引与 canonical |
| --- | --- |
| 无筛选且有结果 | 允许，self-canonical |
| 一个 preset | 允许，self-canonical |
| 一个 preset 加 1–3 个非空类型 | 允许，self-canonical |
| 一个非空类型、字幕组、发布者、search 或 keywords | 允许，self-canonical |
| 一个有效 Subject、search 或 keywords，加一个字幕组或发布者 | 允许，self-canonical |
| 只有一个有效 Subject | 允许，canonical 到 `/subject/:id` |
| 其他组合、多值、include、exclude、provider、时间范围 | noindex,follow，self-canonical |

空结果使用 noindex,follow；有效 Subject 单筛选是例外，仍指向对应作品页。
Subject 必须能解析到作品资料，名称搜索和 party 组合中的各字段必须为单个非空值。

## Subject 与详情

Subject 标题为 `{作品名} 最新动画资源 | Anime Garden`。
简介清理 HTML、实体和多余空白后截取最多 120 字，
用于 HTML、社交卡片、JSON-LD 与 Markdown description；简介为空时省略 description。
海报说明为 `{作品名} 海报`。

详情标题截取资源标题最多 56 字。
description 优先采用解析简介，需要时前置作品名；其次清理上游原始详情，
最后使用页面定义的资源详情说明。图片优先采用详情首图，其次使用 Subject 海报。

## 社交卡片与结构化数据

社交卡片包含 og:site_name、og:locale、og:type、标题、URL 和可用的描述、图片及图片说明。
有图片时 Twitter Card 使用 summary_large_image，否则为 summary。
首页、周历、资源列表和 API 文档使用默认分享图，Subject 与详情使用作品相关图片。

| 页面 | JSON-LD |
| --- | --- |
| 首页 | WebSite、Organization |
| Subject | WebPage、TVSeries 或 CreativeWork，可选 ImageObject |
| 可靠分集详情 | WebPage、TVEpisode |
| 满足视频字段的详情 | VideoObject |

Subject platform 为 TV 时使用 TVSeries，其他平台使用 CreativeWork。
分集详情要求类型为动画、日剧或特摄，并能解析出作品名称和有效集数；
关联 Subject 时，partOfTVSeries 指向作品页。

VideoObject 要求动画、日剧或特摄类型，以及磁力链接、有效资源发布时间和封面。
name 使用完整资源标题，description 沿用页面摘要，uploadDate 使用可见的资源发布时间，
embedUrl 使用移除 tracker 后的 KeepShare 链接。
剧集播出日期只在能够确认时声明；资源发布时间用于上传时间语义。

## Robots 与 Sitemap

Web robots.txt：

```text
User-agent: *
Disallow: /api/
Disallow: /iframe
Disallow: /collection/

Content-Signal: ai-train=yes, search=yes, ai-input=yes

Sitemap: https://animes.garden/sitemap-index.xml
```

API hostname 独立使用 `Disallow: /`，并在所有响应上设置 `X-Robots-Tag: noindex`。
robots.txt 控制同源抓取，页面 noindex 控制索引；爬虫需能读取响应才能处理 noindex。
Content-Signal 作为内容使用信号保留，Google 的 robots 解析支持 user-agent、allow、disallow、sitemap。

Sitemap Index 包含首页、固定资源类型与 preset、字幕组、季度、Subject、
按月分片的资源详情、API 文档及 Skills 引导页。资源筛选链接使用标准 URL 编码。
Sitemap 输出由 `src/sitemap/` 与 sitemap routes 维护。

## 重定向与错误

| 地址或情况 | 行为 |
| --- | --- |
| `/anime` HTML | 跳转到当前 active 季度 |
| `/anime` Markdown | 返回当前季度内容与文案 |
| `/resources/:page` | HTML 与 Markdown 308 到规范化 `/resources` |
| `/subject/:id/:page` | 308 到 `/subject/:id`，保留查询参数 |
| 未匹配路径、明确不存在的详情、收藏夹、Subject、季度 | 404 |
| 数据库、网络或上游临时故障 | 5xx 与 no-store |

HTML 404 页面标题为“页面不存在 | Anime Garden”，使用 noindex,follow，
仅输出错误页所需的基础 head。Subject 的 404 需要上游明确不存在且本地 fallback 也不存在。
Markdown 通过独立错误文本返回对应状态。

`/openapi.json`、`/llms.txt`、`/.well-known/*` 和 sitemap 由各 handler 输出协议内容。
