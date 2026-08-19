# Google Search SEO 当前实现

状态：首版已实现
更新日期：2026-08-19

本文只记录 Anime Garden 当前已经生效的 SEO 行为、页面配置和仍待处理的问题，不描述未采用的方案。

## 实现进度

### 已实现

- 建立 `apps/web/src/utils/seo/`，统一站点常量、页面标题、描述清洗、Open Graph、Twitter Card
  和 JSON-LD builder。
- 每个页面在对应 `apps/web/src/pages/*/seo.ts` 维护页面专属 SEO 规则；HTML 与
  `text/markdown` 直接复用 title 和 description，不再分别维护文案。
- 页面完整 head 生成也位于对应 `seo.ts`，路由 `head()` 只负责传入 loader 数据和路径参数。
- `text/markdown` frontmatter 只输出 title 和 description；其他 SEO 信息仅在 HTML head 中输出。
- 首页使用独立品牌标题；其他页面统一追加 ` | Anime Garden`。
- 首页接入 `WebSite` 和 `Organization`，声明站点名称、Logo 和 GitHub 地址。
- Subject 页面接入 `WebPage`、作品实体和海报。
- 可靠的分集详情接入 `TVEpisode`，不把资源发布时间作为剧集播出日期。
- 满足必需字段的可播放详情接入 `VideoObject`；播放器地址使用 KeepShare 生成链接。
- 周历、资源列表、Subject、详情和 API 文档接入页面级 canonical 和社交卡片。
- Subject description 直接使用清洗、截断后的上游简介；无简介时不输出任何 description。
- 资源列表使用可读的筛选摘要生成 description，不再把搜索语法直接写入摘要。
- 资源列表仅允许稳定的单条件入口和单一名称搜索进入索引；复杂组合与无结果页设置
  `noindex,follow`，Subject 单筛选 canonical 到对应 Subject 页面。
- iframe、匿名收藏夹和未完成的 About 页面设置 `noindex,follow`。
- robots.txt 禁止通用爬虫抓取 API、iframe 和匿名收藏夹路径。
- 补齐 favicon、Apple Touch Icon 和 Web App Manifest。
- Sitemap 移除重定向入口 `/anime`，并使用标准 URL API 编码筛选参数。

### 当前待处理

- 无效详情和无效收藏夹目前跳转首页，尚未返回真实 `404`，可能形成 soft 404。
- Detail description 尚未限制长度；原始上游详情过长时可能生成过长摘要，通用 fallback 文案也仍需
  单独确认。
- Detail 页当前仅提供外部 KeepShare 播放链接，没有在页面主体嵌入播放器，因此即使存在有效
  `VideoObject`，Google 也不保证把它识别为以视频为主要内容的观看页。
- Sitemap 尚未输出真实 `lastmod`。
- About 页面正文尚未完成，因此继续保持 `noindex,follow`。

## 方案概述

### SEO 数据层

当前实现文件：

```text
apps/web/src/utils/seo/
├── constants.ts        # 站点名称、描述、域名、Logo 和默认分享图
├── meta.ts             # title、description 清洗、Open Graph、Twitter Card
├── structured-data.ts  # WebSite、Organization、作品、分集和视频 JSON-LD
└── index.ts            # 统一导出
```

`utils/seo` 只提供跨页面的通用能力，不包含任何单一页面的文案、fallback 或筛选规则。页面专属规则
分别位于：

```text
apps/web/src/pages/
├── _index/seo.ts
├── about/seo.ts
├── anime/seo.ts
├── collection.$hash/seo.ts
├── detail.$provider.$providerId/seo.ts
├── docs.api/seo.ts
├── iframe/seo.ts
├── resources.($page)/seo.ts
└── subject.$subject.($page)/seo.ts
```

每个页面 `seo.ts` 提供两层能力：

- `build*PageSeo()`：生成页面 title、description 和 HTML 分享图数据；Markdown 只读取 title 和
  description。
- `build*PageHead()`：在基础数据上生成 HTML 使用的 meta、canonical、robots、Open Graph、
  Twitter Card 和 JSON-LD。

TanStack Router 的 `head()` 只调用对应页面的 `build*PageHead()` 并传入 loader 数据和路径参数。
Markdown renderer 直接调用同文件的 `build*PageSeo()` 生成 frontmatter。重定向页面不建立独立 SEO
配置。

### 全局站点配置

| 配置             | 当前值                                                    |
| ---------------- | --------------------------------------------------------- |
| 站点名称         | `Anime Garden`                                            |
| 首页标题         | `Anime Garden 動漫花園第三方镜像站以及动画 BT 资源聚合站` |
| 内页标题         | `{页面标题} \| Anime Garden`                              |
| 默认描述         | `動漫花園第三方镜像站以及动画 BT 资源聚合站。`            |
| 站点 URL         | `https://animes.garden/`                                  |
| Logo             | `https://animes.garden/pwa-512x512.png`                   |
| 默认分享图       | `https://animes.garden/twitter.jpg`                       |
| GitHub           | `https://github.com/yjl9903/AnimeGarden`                  |
| 全局 robots meta | `max-image-preview:large`                                 |
| HTML 语言        | `zh-CN`                                                   |

Description 是提供给搜索引擎的候选摘要。Google 仍可能根据搜索词，从页面可见正文中生成其他摘要。

### HTML 与 text/markdown

以下路径支持 `Accept: text/markdown`：

- `/`
- `/anime` 和 `/calendar/:season`
- `/resources` 和 `/resources/:page`
- `/subject/:id`
- `/detail/:provider/:providerId`
- `/collection/:hash`

两种响应共用对应 `pages/*/seo.ts` 中的页面文案。Markdown frontmatter 只保留：

| SEO 数据    | HTML                                     | `text/markdown` frontmatter |
| ----------- | ---------------------------------------- | --------------------------- |
| Title       | `<title>`                                | `title`                     |
| Description | 有内容时输出 `<meta name="description">` | 有内容时输出 `description`  |

Canonical、robots、分享图、Open Graph、Twitter Card 和 JSON-LD 仅由 `build*PageHead()` 输出到 HTML，
不写入 Markdown frontmatter。

`/anime` 的 HTML 会跳转到当前季度；Markdown 会直接返回当前季度内容，title 和 description 使用跳转
目标 `/calendar/:season` 的配置。`/resources` 同理直接返回第 1 页内容。

### 图标配置

根路由当前声明：

| 类型             | 文件                            | 尺寸                        |
| ---------------- | ------------------------------- | --------------------------- |
| ICO favicon      | `/favicon.ico`                  | 64×64                       |
| SVG favicon      | `/favicon.svg`                  | `any`                       |
| PNG favicon      | `/pwa-64x64.png`                | 64×64                       |
| Apple Touch Icon | `/apple-touch-icon-180x180.png` | 180×180                     |
| Web App Manifest | `/site.webmanifest`             | 引用 192×192 和 512×512 PNG |

### Open Graph 与 Twitter Card

接入社交卡片的页面统一输出：

- `og:site_name=Anime Garden`
- `og:locale=zh_CN`
- `og:type=website`
- `og:title`、`og:url`，有 description 时输出 `og:description`
- 有图片时输出 `og:image` 和 `og:image:alt`
- 有图片时使用 `twitter:card=summary_large_image`，否则使用 `summary`
- `twitter:title`，有 description 时输出 `twitter:description`，以及可用的图片和图片说明

首页、周历、资源列表和 API 文档使用默认分享图；Subject 优先使用作品海报；详情优先使用详情封面，
其次使用作品海报。

### robots.txt 与页面索引

当前 robots.txt：

```text
User-agent: *
Disallow: /api/
Disallow: /iframe
Disallow: /collection/

Content-Signal: ai-train=yes, search=yes, ai-input=yes

Sitemap: https://animes.garden/sitemap-index.xml
```

当前作用范围：

- `User-agent: *` 面向遵守 Robots Exclusion Protocol 的通用爬虫，不是访问权限控制。
- robots.txt 只作用于相同协议、hostname 和端口，不控制 `api.animes.garden` 等其他 hostname。
- `Disallow` 控制抓取，不保证 URL 一定不会被索引。
- HTML 页面使用 `noindex` 控制是否进入搜索结果；爬虫需要访问页面才能读取该指令。
- `/about` 因此允许抓取，但页面输出 `noindex,follow`。
- `Content-Signal` 不是 Google 支持的 robots.txt 字段，Google 会忽略；当前作为独立内容使用信号保留。
- Google 支持 `user-agent`、`allow`、`disallow` 和 `sitemap`，不支持 `crawl-delay`。

### Sitemap

Sitemap Index：`https://animes.garden/sitemap-index.xml`。

当前包含：

- 首页。
- 固定资源类型和 preset 筛选页。
- 字幕组筛选页。
- 动画季度周历页。
- Subject 页面。
- 按月份拆分的资源详情页。
- API 文档。

当前不包含 `/anime`、iframe、收藏夹、About 和普通资源分页。

## 页面 SEO 配置

### 页面内容配置

| 页面                            | Title                                                     | Description 生成方式                                                                                                                                                 | Canonical                                    | Robots                                          | Image                  |
| ------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | ---------------------- |
| `/`                             | `Anime Garden 動漫花園第三方镜像站以及动画 BT 资源聚合站` | `動漫花園第三方镜像站以及动画 BT 资源聚合站。`                                                                                                                       | `/`                                          | `max-image-preview:large`                       | 默认分享图             |
| `/calendar/:season`             | `{年份} · {季度名称}动画周历 \| Anime Garden`             | `{年份} · {季度名称}动画周历, 动画每周播出时间表, Anime Garden`                                                                                                      | 当前季度 URL                                 | `max-image-preview:large`                       | 默认分享图             |
| `/resources/:page`              | 根据筛选条件生成，再追加 ` \| Anime Garden`               | 无筛选：页面专属固定描述；有筛选：`{页面标题}。筛选条件：{可读筛选摘要}。`，最长 160 字                                                                              | 当前页及查询参数；Subject 单筛选指向 Subject | 简单筛选允许；复杂筛选或无结果 `noindex,follow` | 默认分享图             |
| `/subject/:id`                  | `{作品名} 最新动画资源 \| Anime Garden`                   | 有简介：清理 HTML、实体和多余空白，截取 120 字，不添加作品名前缀；无简介：HTML、OG、Twitter 和 JSON-LD 均不输出 description                                          | 当前 Subject URL                             | `max-image-preview:large`                       | 作品海报               |
| `/detail/:provider/:providerId` | `{资源标题，最多 56 字} \| Anime Garden`                  | 解析后的简介未以作品名开头时输出 `{作品名}：{简介}`；否则直接使用简介；没有解析简介时清理原始详情描述；仍为空时输出 `查看“{作品名}”的资源详情、文件列表和发布信息。` | 当前详情 URL                                 | `max-image-preview:large`                       | 详情首图，否则作品海报 |
| `/docs/api`                     | `Open API 文档 \| Anime Garden`                           | `查看 Anime Garden 动画 BT 资源开放 API、请求参数、响应结构和交互式调用示例。`                                                                                       | `/docs/api`                                  | `max-image-preview:large`                       | 默认分享图             |
| `/about`                        | `关于 \| Anime Garden`                                    | `了解 Anime Garden 的动画资源聚合、动画周历和开放 API。`                                                                                                             | `/about`                                     | `noindex,follow`                                | 不输出                 |
| `/iframe`                       | 与 `/resources/:page` 一致                                | 与 `/resources/:page` 一致                                                                                                                                           | 不输出                                       | `noindex,follow`                                | 不输出                 |
| `/collection/:hash`             | `{收藏夹名称或“资源收藏夹”} \| Anime Garden`              | 有名称：`查看 Anime Garden 收藏夹“{收藏夹名称}”中的动画资源。`；无名称：`查看 Anime Garden 资源收藏夹中的动画资源。`                                                 | 当前收藏夹 URL                               | `noindex,follow`                                | 不输出                 |

### Subject Title 与 Description 拼接规则

有效 Subject 页面：

- Title 固定为 `{作品名} 最新动画资源 | Anime Garden`。
- 有上游简介时，依次清理 HTML 标签、HTML 实体和多余空白，然后截取至最多 120 字，直接作为
  description；不添加作品名前缀或其他补充文案。
- 无上游简介或清理后为空时，不输出 HTML description、Open Graph description、Twitter
  description、JSON-LD description 和 Markdown frontmatter description。
- 海报说明独立使用 `{作品名} 海报`，不参与 description 拼接。

### Resources Title 拼接规则

首先生成不含站点后缀的 `heading`，再通过 `buildPageTitle()` 追加 ` | Anime Garden`。`heading` 按以下
优先级选择，匹配后不再继续：

| 优先级 | 条件                            | Heading                                   |
| ------ | ------------------------------- | ----------------------------------------- |
| 1      | 能解析出一个或多个 Subject 名称 | `{Subject 名称，以空格连接} 最新动画资源` |
| 2      | 存在 search                     | `{search 值，以空格连接} 最新动画资源`    |
| 3      | 存在 include                    | `{第一个 include} 最新动画资源`           |
| 4      | 只有一个 keywords               | `{keywords} 最新动画资源`                 |
| 5      | 存在 preset                     | `{preset 展示名称} 最新动画资源`          |
| 6      | 只有一个字幕组                  | `{字幕组} 最新动画资源`                   |
| 7      | 只有一个发布者                  | `{发布者} 最新动画资源`                   |
| 8      | 只有一个资源类型                | `最新{资源类型}资源`                      |
| 9      | 以上均不满足                    | `所有资源`                                |

组合标题是优先级 1、2、4 的补充规则：

- 单一 Subject + 单一字幕组或发布者：`{Subject 名称} {字幕组或发布者} 最新动画资源`。
- 单一 search + 单一字幕组或发布者：`{search} {字幕组或发布者} 最新动画资源`。
- 单一 keywords + 单一字幕组或发布者：`{keywords} {字幕组或发布者} 最新动画资源`。
- 多个 Subject、search、字幕组或发布者不触发组合标题。
- 同时存在一个字幕组和一个发布者的组合不在索引白名单内；标题选择字幕组，但页面设置
  `noindex,follow`。

### Resources Description 拼接规则

无有效筛选摘要时使用固定 description：

```text
Anime Garden 动画 BT 资源聚合列表，支持按作品、字幕组、发布者、资源类型和发布时间筛选。
```

存在筛选条件时使用：

```text
{heading}。筛选条件：{筛选摘要}。
```

最终 description 最多 160 字，超出时使用 `...` 截断。筛选摘要按以下顺序拼接，各维度使用中文分号
分隔，同一维度的多个值使用顿号分隔：

| 顺序 | 筛选字段   | 摘要片段                     |
| ---- | ---------- | ---------------------------- |
| 1    | preset     | `预设“{展示名称}”`           |
| 2    | subjects   | `作品“{Subject 名称}”`       |
| 3    | types      | `资源类型“{类型}”`           |
| 4    | publishers | `发布者“{名称}”`             |
| 5    | fansubs    | `字幕组“{名称}”`             |
| 6    | provider   | `来源“{provider}”`           |
| 7    | search     | `标题搜索“{搜索词}”`         |
| 8    | include    | `标题匹配“{搜索词}”`         |
| 9    | keywords   | `包含关键词“{关键词}”`       |
| 10   | exclude    | `排除关键词“{关键词}”`       |
| 11   | after      | `发布时间不早于{yyyy-MM-dd}` |
| 12   | before     | `发布时间不晚于{yyyy-MM-dd}` |

典型输出：

| 筛选条件                                   | Title                             | Description   |
| ------------------------------------------ | --------------------------------- | ------------- |
| 无筛选                                     | `所有资源                         | Anime Garden` | `Anime Garden 动画 BT 资源聚合列表，支持按作品、字幕组、发布者、资源类型和发布时间筛选。` |
| `type=动画`                                | `最新动画资源                     | Anime Garden` | `最新动画资源。筛选条件：资源类型“动画”。`                                                |
| `search=测试作品`、`fansub=测试字幕组`     | `测试作品 测试字幕组 最新动画资源 | Anime Garden` | `测试作品 测试字幕组 最新动画资源。筛选条件：字幕组“测试字幕组”；标题搜索“测试作品”。`    |
| `keyword=测试作品`、`publisher=测试发布者` | `测试作品 测试发布者 最新动画资源 | Anime Garden` | `测试作品 测试发布者 最新动画资源。筛选条件：发布者“测试发布者”；包含关键词“测试作品”。`  |
| `subject=100`、`publisher=测试发布者`      | `测试动画 测试发布者 最新动画资源 | Anime Garden` | `测试动画 测试发布者 最新动画资源。筛选条件：作品“测试动画”；发布者“测试发布者”。`        |
| `preset=bangumi`、`type=动画&type=合集`    | `番剧 最新动画资源                | Anime Garden` | `番剧 最新动画资源。筛选条件：预设“番剧”；资源类型“动画”、“合集”。`                       |

`/iframe` 直接复用 Resources 的 Title 和 Description 生成逻辑，但始终保持 `noindex,follow`。

页面返回的分享图说明如下：

- 首页：`Anime Garden 动画资源聚合站`。
- 周历：`Anime Garden 动画周历`。
- 资源列表：`Anime Garden 最新动画资源`。
- Subject：`{作品名} 海报`。
- 详情：`{解析后的作品名} 海报`。
- API 文档：`Anime Garden 开放 API 文档`。

### 页面索引与展示配置

| 页面                            | 索引状态                                 | robots.txt 抓取          | JSON-LD                                                       | Open Graph / Twitter | Sitemap        |
| ------------------------------- | ---------------------------------------- | ------------------------ | ------------------------------------------------------------- | -------------------- | -------------- |
| `/`                             | 可索引                                   | 允许                     | `WebSite`、`Organization`                                     | 默认分享图           | 是             |
| `/calendar/:season`             | 可索引                                   | 允许                     | 无                                                            | 默认分享图           | 是             |
| `/subject/:id`                  | 可索引；不存在时返回 `404`               | 允许                     | `WebPage`、`TVSeries` 或 `CreativeWork`、可选 `ImageObject`   | 作品海报可用时输出   | 是             |
| `/detail/:provider/:providerId` | 可索引；无效资源当前跳转首页             | 允许                     | 可靠分集有 `WebPage`、`TVEpisode`；满足字段时有 `VideoObject` | 详情封面或作品海报   | 是，按月份分片 |
| `/resources/:page`              | 仅无筛选、稳定单条件和单一名称搜索可索引 | 允许                     | 无                                                            | 默认分享图           | 仅固定筛选入口 |
| `/docs/api`                     | 可索引                                   | 允许                     | 无                                                            | 默认分享图           | 是             |
| `/about`                        | `noindex,follow`                         | 允许，以便读取 `noindex` | 无                                                            | 无                   | 否             |
| `/iframe`                       | `noindex,follow`                         | 禁止                     | 无                                                            | 无                   | 否             |
| `/collection/:hash`             | `noindex,follow`；无效收藏夹当前跳转首页 | 禁止                     | 无                                                            | 无                   | 否             |

未显式设置 `noindex` 的页面默认允许索引，并继承全局 `max-image-preview:large`。

### 结构化数据条件

Subject 页面：

- 始终建立 `WebPage` 和作品实体之间的关系。
- `platform === "TV"` 时使用 `TVSeries`；其他平台使用 `CreativeWork`。
- 有海报时增加 `ImageObject`，并连接到页面和作品实体。
- description 仅在存在上游简介时连接到页面和作品实体。

资源列表页面：

索引判断先统计有效筛选维度。数组字段只有长度大于 0 时才算一个维度；同一维度包含多个值仍然只算一个
维度，但不满足“单一值”的索引条件。判断不受页码影响。

| 条件                                                                | Robots           | Canonical          |
| ------------------------------------------------------------------- | ---------------- | ------------------ |
| 无筛选条件且有结果                                                  | 默认允许索引     | 当前 Resources URL |
| 只有一个 preset                                                     | 默认允许索引     | 当前 Resources URL |
| 一个 preset 加 1～3 个资源类型                                      | 默认允许索引     | 当前 Resources URL |
| 只有一个资源类型                                                    | 默认允许索引     | 当前 Resources URL |
| 只有一个字幕组                                                      | 默认允许索引     | 当前 Resources URL |
| 只有一个发布者                                                      | 默认允许索引     | 当前 Resources URL |
| 只有一个非空 search                                                 | 默认允许索引     | 当前 Resources URL |
| 只有一个非空 keywords                                               | 默认允许索引     | 当前 Resources URL |
| 一个有效 Subject、非空 search 或非空 keywords，加一个字幕组或发布者 | 默认允许索引     | 当前 Resources URL |
| 只有一个有效 Subject                                                | 默认允许索引     | `/subject/:id`     |
| Subject 无法解析为有效作品                                          | `noindex,follow` | 当前 Resources URL |
| include、exclude、provider 或发布时间范围                           | `noindex,follow` | 当前 Resources URL |
| 超出上述白名单的多值筛选                                            | `noindex,follow` | 当前 Resources URL |
| 超出上述白名单的多筛选维度组合                                      | `noindex,follow` | 当前 Resources URL |
| 筛选结果为空                                                        | `noindex,follow` | 当前 Resources URL |

补充规则：

- preset 可以单独使用，也可以与 1～3 个非空资源类型组合；首页使用的
  `preset=bangumi&type=动画&type=合集` 属于允许索引的组合。
- Subject、search 和 keywords 可以分别与一个非空字幕组或一个非空发布者组合。Subject 必须能成功
  加载，search 和 keywords 必须恰好有一个非空值；任一维度包含多个值时不适用该白名单。
- Subject 单筛选只有在 Subject 数据成功加载时才 canonical 到 `/subject/:id`；这是无结果规则的唯一例外。
- Subject 与字幕组或发布者组合时使用当前 Resources URL 作为 self-canonical，不 canonical 到 Subject
  页面。
- 分页页面保持各自的 self-canonical；同一筛选序列允许复用 description。

详情页面：

- 只有资源类型为动画、日剧或特摄，并且能解析出作品名称和有效集数时，才输出 `TVEpisode`。
- 有关联 Subject 时，`partOfTVSeries` 指向对应 Subject URL。
- 不输出无法确认的 `datePublished`。
- 只有资源类型为动画、日剧或特摄，并且同时存在磁力链接、有效资源发布时间和详情首图或 Subject
  海报时，才输出 `VideoObject`，避免缺少 Google 必需字段的无效标记。
- `VideoObject.name` 使用完整资源标题，`description` 与页面 meta description 一致，
  `thumbnailUrl` 使用详情首图或 Subject 海报，`uploadDate` 使用页面可见的资源发布时间。
- `VideoObject.embedUrl` 使用 `https://keepshare.org/{KEEPSHARE_ID}/{编码后的磁力链接}`；生成时移除
  tracker 参数。KeepShare 地址是播放器页面而非直接媒体文件，因此不输出 `contentUrl`。
- `VideoObject` 只向搜索引擎声明结构化字段，不等于已满足 Google 视频索引条件。当前 Detail 页的
  视频仍是外部链接；若要提高视频索引资格，需要在可索引页面主体中提供可抓取、以视频为主要内容的
  播放体验，并确保缩略图 URL 稳定可访问。

### 重定向与非 HTML 路由

| 路由                                   | 当前行为                                     |
| -------------------------------------- | -------------------------------------------- |
| `/anime`                               | 跳转到当前有效季度 `/calendar/:season`       |
| `/resources/`                          | 跳转到 `/resources/1`，保留查询参数          |
| `/subject/:id/:page`                   | 跳转到 `/subject/:id`，保留查询参数          |
| 未匹配的 HTML 路径                     | 跳转首页                                     |
| 无效详情                               | 跳转首页                                     |
| 无效收藏夹                             | 跳转首页                                     |
| `/robots.txt`                          | 输出抓取规则                                 |
| `/sitemap-index.xml`、`/sitemap-*.xml` | 输出 Sitemap Index 和分片 Sitemap            |
| `/openapi.json`                        | 输出 OpenAPI 文档数据，不设置 HTML SEO meta  |
| `/llms.txt`                            | 输出面向模型的站点说明，不设置 HTML SEO meta |
| `/.well-known/*`                       | 输出 API/MCP 发现数据，不设置 HTML SEO meta  |
