# @animegarden/web 架构总览

检查日期：2026-06-28

## 定位

`apps/web` 是 AnimeGarden 的 TanStack Start 前端应用，外层保留一层 Hono Node server。它负责页面 SSR / hydration、资源浏览和筛选、搜索、收藏夹、详情页、feed / sitemap 输出、OpenAPI 文档页和前端埋点。

Web 不再提供 `/api/*` 代理；API 读写由独立 server/feed 服务承担，前端数据读取继续通过 `@animegarden/client` 指向 `WEB_SERVER_URL` / `FEED_HOST`。

## 运行形态

| 入口           | 代码                                                    | 职责                                                                                          |
| -------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| TanStack Start | `src/router.tsx`、`src/routes/`、`src/routeTree.gen.ts` | 文件路由、SSR、head/meta、loader 和 hydration                                                 |
| Node server    | `server.mjs` + `node/`                                  | Fly / Node 环境运行 Hono，托管静态资源、保留 `/health`、feed、sitemap，并把页面请求交给 Start |
| 页面组件       | `src/pages/`                                            | 纯前端页面渲染和页面局部交互；数据由 `routes/` 透传为 props                                   |

`vite.config.ts` 使用 `tanstackStart()`、React Vite plugin、UnoCSS、Icons、Info、Analytics、Inline 和 tsconfig paths。Cloudflare Worker 构建入口、wrangler 配置和 Worker 静态资源适配已移除，Web 只支持 Node/Fly 部署。

## 请求与数据流

浏览器请求先进入 Hono 外壳：

1. `/health` 直接返回健康状态。
2. `/api/*` 明确返回 404，避免 Web 被当作 API 代理。
3. `/feed.xml` 和 `/collection/:hash/feed.xml` 代理到 `FEED_SERVER_URL`。
4. `/.well-known/mcp/server-card.json` 由 TanStack Start route 返回 MCP Server Card。
5. `/sitemap-*.xml` 由 `node/sitemap.ts` 生成，必要时请求 feed server 获取 teams、subjects、detail URL。
6. 其他请求交给 TanStack Start server entry。

页面 loader 通过 `src/query/` 的 TanStack Query options 预取数据，query 函数通过 TanStack Start `createServerFn()` 调用 `@animegarden/client`。远端资源数据不放入 TanStack Store；Store 只承载主题、收藏夹、搜索历史、fansub 偏好和 sidebar/UI 状态，并由 `createRouter()` 为每个 router 实例创建。

GET server function 和 SSR loader 的公开缓存头统一由 `src/utils/response.ts` 设置：timestamp、资源列表和 collection 页面使用 `public, max-age=30, s-maxage=60`，详情页使用 `public, max-age=3600, s-maxage=86400`。上游失败或 `ok: false` 时返回错误状态并设置 `Cache-Control: no-store`，避免浏览器或 CDN 缓存错误响应。

`bgmd` 的 subject/full/calendar 数据不应新增到客户端运行时依赖；需要读取这类数据的页面应通过 `src/query/subject.ts` 的 TanStack Query options 和 `createServerFn()` 访问。现有搜索、筛选展示和收藏夹中仍有 basic subject 客户端依赖，后续迁移时应收敛到同一条 serverFn 查询链路。

## 代码逻辑分类

| 目录              | 主要职责                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`     | TanStack file routes；定义 `createFileRoute`、loader/head、URL/params/search 归一化，并用 `Route.useLoaderData()` 组装页面 props |
| `src/pages/`      | 纯前端页面渲染和页面局部组件；不导出 loader/head，也不直接读取 TanStack route loader 数据                                        |
| `src/layouts/`    | 全局布局、Header、Footer、Search、Sidebar、Theme、Loading                                                                        |
| `src/components/` | 可复用 UI 和业务组件，资源表格在 `components/Resources/`                                                                         |
| `src/query/`      | TanStack Query options、mutation options 和对应 server functions；封装 Web 到后端 API 的调用边界                                 |
| `src/stores/`     | 基于 TanStack Store 的本地 UI 状态 factory：收藏夹、搜索、主题、字幕组偏好、sidebar                                              |
| `src/utils/`      | URL、canonical、日期、错误、埋点、subject、代码生成等工具                                                                        |
| `node/`           | Node / Hono feed 代理、sitemap、env、etag                                                                                        |
| `public/`         | favicon、PWA 和公开静态资源                                                                                                      |

## 主要页面分组

| URL                              | Route module                                    | Page                                           |
| -------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| `/`                              | `routes/index.tsx`                              | `pages/_index/route.tsx`                       |
| `/resources`、`/resources/:page` | `routes/resources/`                             | `pages/resources.($page)/route.tsx`            |
| `/detail/:provider/:providerId`  | `routes/detail/$provider/$providerId/route.tsx` | `pages/detail.$provider.$providerId/route.tsx` |
| `/subject/:subject`              | `routes/subject/$subject/route.tsx`             | `pages/subject.$subject.($page)/route.tsx`     |
| `/collection/:hash`              | `routes/collection/$hash/route.tsx`             | `pages/collection.$hash/route.tsx`             |
| `/anime`                         | `routes/anime/route.tsx`                        | `pages/anime/route.tsx`                        |
| `/docs/api`                      | `routes/docs/api/route.tsx`                     | `pages/docs.api/route.tsx`                     |
| `/iframe`                        | `routes/iframe.tsx`                             | `pages/iframe/route.tsx`                       |

## 修改入口建议

- 改页面数据加载、head 或 canonical：先看 `src/routes/**`，页面组件只接收 route 传入的 props。
- 改资源表格或分页：先看 `src/components/Resources/` 和 `src/pages/resources.($page)/`。
- 改搜索体验：先看 `src/layouts/Search/`、`src/stores/search.ts`。
- 改收藏夹：先看 `src/layouts/Sidebar/`、`src/stores/collection.ts`、`src/pages/collection.$hash/route.tsx`。
- 改部署、feed 或 sitemap：先看 `server.mjs`、`node/proxy.ts`、`node/sitemap.ts`、`vite.config.ts`。

## Route / Page 边界

`src/routes/**` 是 TanStack Start 原生边界。每个页面 route 应在这里声明 loader、head、params/search 解析、redirect 和 canonical 等 SSR 相关逻辑；组件内部使用对应的 `Route.useLoaderData()`、`Route.useParams()`、`useLocation()` 等 route API 组装出稳定 props，再传给 `src/pages/**`。

loader 是 route 的数据入口，但不是 server-only 边界：SSR 首次渲染会在服务端执行，客户端导航、预加载和缓存失效时也可能从浏览器侧触发。需要使用 Node-only 依赖、私密环境变量或只应在服务端运行的逻辑时，应包进 TanStack Start `createServerFn()`，再由 loader 调用。

`src/pages/**` 只负责浏览器侧页面展示、局部交互和组合业务组件。页面文件不再导出 loader/head/meta，不直接调用 `useLoaderData()`，也不承担 URL 到数据模型的转换；需要的数据都通过 route props 传入。
