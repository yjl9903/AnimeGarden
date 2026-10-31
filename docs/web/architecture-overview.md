# Web 架构总览

`apps/web` 是 TanStack Start 前端应用，使用 Hono Node server 托管。
Web 负责 SSR、hydration、资源浏览、搜索、收藏夹、详情、站点地图、OpenAPI 展示和交互埋点；
资源 API 与 RSS 由独立 server/feed 服务提供。

## 运行入口

| 入口 | 位置 | 职责 |
| --- | --- | --- |
| Node server | `server.mjs` | 静态资源、health、转发页面请求到 Start |
| Router | `src/router.tsx`、`src/routes/` | 文件路由、loader、head 与导航 |
| 全局中间件 | `src/start.ts` | Markdown 协商、非 HTML 响应 ETag |
| 页面组件 | `src/pages/` | 渲染页面和局部交互 |
| Vite | `vite.config.ts` | Start、React、UnoCSS、Icons、Info、Analytics 和 Inline |

部署使用 Node/Fly。Vite 通过 `resolve.tsconfigPaths: true` 解析 TypeScript 路径，
配置目录以 `import.meta.dirname` 定位。

## 请求链路

1. Hono 处理静态资源和 `/health`，`/api/*` 返回 404。
2. 其他请求进入 TanStack Start。
3. 页面 loader 使用 Query options 获取数据。
4. Query 通过 `createServerFn()` 调用 `@animegarden/client` 或服务端 Bangumi 数据源。
5. Route 组装 props，Page 渲染视图；交互页面继续订阅相同 Query。

SSR、客户端导航和预加载都可以执行 loader。
Node-only 依赖、私密环境变量和后端访问封装在 server function 中。
API 与 feed 地址通过 `WEB_SERVER_URL`、`FEED_HOST` 和 client 配置确定。

## 状态与缓存

| 状态 | 归属 |
| --- | --- |
| URL、params、search、页面结构 | TanStack Router |
| 资源、版本、详情、Subject、周历和收藏夹响应 | TanStack Query |
| 主题、本地收藏、搜索历史、字幕组偏好与侧栏状态 | TanStack Store |

Router 为每个实例创建 QueryClient 和 UI stores，SSR 按请求隔离。
普通命令式查询使用 `queryClient.query()`，无限列表使用 `queryClient.infiniteQuery()`。
fresh 缓存复用，stale 或 invalidated 时查询新结果；聚合查询的子项遵循相同规则。

资源、版本、收藏夹的 staleTime 为 1 分钟，详情、Subject、周历为 1 小时。
HTTP 缓存与 Query 新鲜度分别配置，详见[性能与缓存](./performance.md)。

## 资源页面

资源页通过 `useResourceList()` 使用原生无限查询。
共享 `pages: 1` 配置使刷新替换为新首批，续页沿 nextCursor 追加。
首次失败仍保持查询订阅，后续刷新可以恢复页面。

全局已知版本保存在 timestamp Query，前台每 60 秒旁路刷新。
资源请求开始时同步读取已知版本，编码为无位置 cursor；未知时由服务端选择版本。
版本及列表刷新规则见[资源查询与分页](./resources-pagination.md)。

| 页面 | 展示方式 |
| --- | --- |
| 首页 | 单批资源预览 |
| `/resources` | 筛选结果与无限滚动 |
| `/subject/:subject` | 单批最多 1000 条，按字幕组或发布者分组 |
| `/collection/:hash` | 每个筛选项最多 100 条，按分组展示 |
| `/iframe` | loader 按 URL limit 查询后静态展示 |

首页和收藏夹仅在有更多结果时显示右对齐的“→ 全部资源”。
Subject 的分组标题携带相应筛选条件进入资源列表。
iframe 保留 className/style，limit 变化时重新加载，并停用全局版本轮询。

站内资源链接使用 `Link` 和 `getResourcesRouteLink()`，链接与 canonical 只携带筛选条件。
旧 `/resources/:page` 在 HTML、Markdown 下均以 308 跳转到 `/resources`；
旧 `/subject/:subject/:page` 在数据加载前以 308 跳转到 Subject 主页，保留查询参数。

页面宽度和外侧留白由 Layout 管理。收藏夹等无外框资源分组直接使用内容宽度，
标题沿用首页的响应式左缩进，分组间距沿用 Subject 页。

## Bangumi 与周历

Bangumi 数据由服务端按需查询 bgmx，页面经 `src/query/subject.ts` 读取，
资料转换和缓存规则见[Subject 数据源](../server/subject-data-source.md)。

周历数据包括七天 calendar 和独立 web 数组。内部将 WEB 作为第八组，
页面轮转前七组后固定展示 WEB；星期目录与 Markdown 使用相同分类。
桌面星期目录在视口宽度达到 1024px 时显示。

Calendar 的 season 为季度月份 `YYYY-MM`，is_active 用于默认季度选择。
`getCalendars()` 返回的所有季度都进入季度菜单、直达页面、站点地图和 Markdown。
不存在的季度返回 404；数据源失败按上游错误处理。

## 内容输出与发现

| 内容 | 入口与规则 |
| --- | --- |
| HTML | TanStack Start SSR 与 hydration |
| Markdown | 支持的页面在 GET/HEAD 且 Accept 为 text/markdown 时，由 `src/markdown/` 输出 |
| Sitemap | `src/sitemap/` 与 sitemap server routes，调用后端内部 sitemap API |
| OpenAPI | `/openapi.json` 与 `/docs/api` |
| Agent 发现 | `/llms.txt`、`/.well-known/*` |
| Skill 文件 | 构建时复制到 `/.well-known/agent-skills/animegarden/`，生成内容摘要 index.json |

非 HTML 的 router GET 200 响应生成强 ETag，处理 If-None-Match；
Sitemap HEAD 与 GET 共用内容来源。HTML streaming 和 server function 使用各自协议。
Skill Markdown 文件由 Node server 直接以 `text/markdown; charset=utf-8` 返回。

## Skills 与引导

`/skills` 复用 Layout、搜索、侧栏和主题，正文包括直接使用、安装 Skill、MCP 和插件。
HTML 与 Markdown 共用 `src/pages/skills/content.ts` 中的提示词、命令和静态示例。
示例表格的播放、下载沿用资源组件的入口。

`OpenInChat` 提供应用打开与“复制并打开”两类入口，
平台地址和 Skill URL 覆盖由 `src/components/Skills/chat-apps.ts` 管理。
链接参数使用 URLSearchParams 编码，复制成功后才执行复制型跳转。

首页保留 Skills/MCP 入口。`SkillsOnboarding` 使用 localStorage 限制累计展示两次、
sessionStorage 限制同一标签页会话展示一次；首次进入 Skills 页时跳过引导，
点击发送入口后停止提示。提示词组件与 Skills 页共用。
发布与插件维护见[集成文档](../integrations/README.md)。

## 代码导航

| 目录 | 职责 |
| --- | --- |
| `src/routes/` | loader、head、URL 归一化、redirect 和页面数据订阅 |
| `src/pages/` | 页面渲染和局部组件，以 props 接收数据 |
| `src/layouts/` | Layout、Header、Footer、Search、Sidebar、Theme、Loading |
| `src/components/` | 通用 UI、资源表格、滚动哨兵、Skills 组件 |
| `src/query/` | Query options、mutation 和 server functions |
| `src/stores/` | 本地 UI 状态 |
| `src/markdown/`、`src/sitemap/` | Markdown 与站点地图 |
| `src/utils/` | URL、canonical、日期、错误、埋点和代码生成 |
| `public/` | favicon、PWA 和公开静态资源 |

页面图标统一在 `src/routes/__root.tsx` 声明，资源位于 public。
交互事件见[Umami 契约](./umami-tracking.md)，搜索引擎规则见[SEO 方案](./google-search-seo-plan.md)。
