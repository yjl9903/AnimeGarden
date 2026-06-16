# @animegarden/web 架构总览

检查日期：2026-05-08

## 定位

`apps/web` 是 AnimeGarden 的前端 Remix 应用，同时带有一层 Hono 运行时外壳。它负责页面 SSR / hydration、资源浏览和筛选、搜索、收藏夹、详情页、RSS / API 代理、sitemap 输出、OpenAPI 文档页和前端埋点。

## 运行形态

| 入口              | 代码                          | 职责                                                                 |
| ----------------- | ----------------------------- | -------------------------------------------------------------------- |
| Node server       | `server.mjs` + `node/`        | Fly / Node 环境运行 Hono，托管静态资源、代理 API / feed、挂载 Remix  |
| Cloudflare Worker | `worker.ts` + `cloudflare/`   | Cloudflare 环境运行 Hono，优先从 KV 取静态资源，再 fallback 到 Remix |
| Remix app         | `app/root.tsx`、`app/routes/` | 页面路由、loader、meta、React 组件和客户端状态                       |

`vite.config.ts` 注入构建环境、Analytics、UnoCSS、Remix、Icons、tsconfig paths 和 inline 插件。`SSR_ADAPTER` 会影响构建面向 Cloudflare 还是 Node。

## 请求与数据流

浏览器请求先进入 Hono 外壳：

1. `/api/*` 由 `node/proxy.ts` 转发到 `FEED_SERVER_URL`，并补 CORS / cache headers。
2. `/feed.xml` 和收藏夹 feed 同样通过代理读取后端 feed 服务。
3. `/sitemap-*.xml` 由 `node/sitemap.ts` 生成，必要时请求 feed server 获取 teams、subjects、detail URL。
4. 其他请求交给 Remix `createRequestHandler()`。

Remix loader 通过 `app/utils/api.ts` 调用 `@animegarden/client`，根据 SSR / client 环境选择 `WEB_SERVER_URL` 或 `FEED_HOST`。资源列表、详情、收藏夹等页面共享这层 API 封装和 `lastTimestamp` 回退逻辑。

代理和 SSR 错误响应统一按不可缓存处理：`/api/*`、`/feed.xml` 会保留上游错误状态码并返回 `Cache-Control: no-store`；Remix 入口会对 `status >= 400` 的页面响应补 `Cache-Control: no-store`，避免 CDN 或边缘缓存规则保存错误页面。

线上域名、Fly app、内网后端和 public API 的对应关系见 [server/deployment-topology.md](../server/deployment-topology.md)。

## 代码逻辑分类

| 目录              | 主要职责                                                       |
| ----------------- | -------------------------------------------------------------- |
| `app/routes/`     | Remix 文件路由和 loader/meta/page 组件                         |
| `app/layouts/`    | 全局布局、Header、Footer、Search、Sidebar、Theme、Loading      |
| `app/components/` | 可复用 UI 和业务组件，资源表格在 `components/Resources/`       |
| `app/states/`     | Jotai 状态：收藏夹、搜索、主题、字幕组偏好                     |
| `app/utils/`      | API、URL、canonical、日期、错误、埋点、subject、代码生成等工具 |
| `app/styles/`     | 全局 CSS、布局、侧栏、toast 样式                               |
| `node/`           | Node / Hono 适配层、API / feed 代理、sitemap、env、etag        |
| `cloudflare/`     | Cloudflare Worker Remix 适配和静态资源读取                     |
| `public/`         | favicon、PWA 和公开静态资源                                    |

## 主要页面分组

| 路由                            | 文件                                            | 职责                                        |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `/`                             | `routes/_index/route.tsx`                       | 首页，默认展示 Bangumi 动画 / 合集资源      |
| `/resources/:page?`             | `routes/resources.($page)/route.tsx`            | 资源列表、筛选、分页、feed URL              |
| `/detail/:provider/:providerId` | `routes/detail.$provider.$providerId/route.tsx` | 资源详情、磁力链接、PikPak、结构化 metadata |
| `/subject/:subject/:page?`      | `routes/subject.$subject.($page)/`              | subject 资源分组和主题信息                  |
| `/collection/:hash`             | `routes/collection.$hash/route.tsx`             | 收藏夹分享页                                |
| `/anime`                        | `routes/anime/route.tsx`                        | 动画周历                                    |
| `/docs/api`                     | `routes/docs.api/route.tsx`                     | OpenAPI / Swagger UI                        |
| `/iframe`                       | `routes/iframe/route.tsx`                       | 嵌入展示入口                                |

## 布局、状态和交互

`app/root.tsx` 提供 HTML shell、字体、analytics script、UnoCSS / preset CSS、Jotai Provider、scroll handler 和 error boundary。业务页面通常包在 `layouts/Layout.tsx` 中，统一包含 Hero search、Header、Sidebar、Footer 和 Loading。

搜索逻辑集中在 `layouts/Search/`，收藏夹侧栏集中在 `layouts/Sidebar/`，资源表格集中在 `components/Resources/`。主题切换、收藏夹、搜索历史和 fansub 偏好通过 `app/states/` 的 Jotai atom 管理。

## 修改入口建议

- 改页面数据加载：先看对应 `app/routes/**/route.tsx` 的 loader，再看 `app/utils/api.ts`。
- 改资源表格或分页：先看 `app/components/Resources/` 和 `routes/resources.($page)/`。
- 改搜索体验：先看 `app/layouts/Search/`、`app/states/search.ts`。
- 改收藏夹：先看 `app/layouts/Sidebar/`、`app/states/collection.ts`、`routes/collection.$hash/route.tsx`。
- 改部署或代理：先看 `server.mjs`、`node/proxy.ts`、`cloudflare/`、`vite.config.ts`。
- 改埋点：先看 `app/utils/umami.ts` 和 `docs/web/umami-tracking.md`。
