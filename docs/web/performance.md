# 前端性能与缓存

Web 使用 TanStack Start、TanStack Query 和 Hono Node server。
本文定义数据范围、缓存和性能维护边界；整体职责见[架构总览](./architecture-overview.md)。

## 请求与数据边界

- Router 负责 URL、页面 loader、head 和导航。
- QueryClient 负责远端数据缓存、请求协调和 hydration。
- Server Functions 负责 Web 到后端的 typed RPC。
- TanStack Store 保存收藏、主题、偏好、历史及 UI 状态。
- Hono 外壳负责静态资源和 health，页面请求交给 TanStack Start。

loader 预取与页面订阅共用 query options。
普通查询使用 `queryClient.query()`，资源无限列表使用 `queryClient.infiniteQuery()`。
SSR 的 QueryClient 和 UI stores 按请求创建。

## Query 新鲜度

| 数据 | staleTime |
| --- | --- |
| 资源列表、provider 版本、收藏夹 | 1 分钟 |
| 详情、Subject、周历 | 1 小时 |

fresh 缓存直接复用，stale 或 invalidated 的命令式查询等待新结果。
聚合查询中的 Subject 名称与关键词子查询遵循各自的新鲜度配置。
已知版本高于资源列表 anchor 时，导航以 staleTime 0 查询首批。

资源页使用共享 `pages: 1` 配置完成首批刷新，滚动续页由原生 Infinite Query 管理。
完整流程见[前端资源查询与分页](./resources-pagination.md)。

## HTTP 缓存

SSR 与 server function 的策略集中在 `src/utils/response.ts`：

| 响应 | Cache-Control |
| --- | --- |
| timestamp、资源列表、收藏夹 | `public, max-age=30, s-maxage=60` |
| 详情、Subject、周历、文档 | `public, max-age=3600, s-maxage=86400` |
| 错误 | `no-store` |

Query staleTime 管理客户端缓存的新鲜度，HTTP 缓存管理浏览器与 CDN 响应复用。
公开 API 的 cursor 缓存档位由 server 配置，见[服务端 HTTP 缓存](../server/resources-query.md#http-缓存)。

全局 request middleware 为非 HTML 的 router GET 200 响应生成强 ETag，
处理 If-None-Match 和 304。HTML SSR streaming 与 server function 使用各自的响应协议。
Sitemap 的 HEAD handler 与 GET 共用内容来源。

## 页面数据范围

| 页面 | 单次资源范围 |
| --- | --- |
| 首页、资源页首批 | 30 条 |
| Subject 分组概览 | 最多 1000 条 |
| 收藏夹 | 每个筛选项最多 100 条 |
| iframe | URL limit，沿用 API 默认值与实现范围 |

Subject 数据通过服务端 bgmx 按需读取。资源页后续批次由接近视口的列表尾部触发，
自动请求间隔至少 1 秒。

页面数据量同时影响上游查询、server function 传输、SSR HTML 和 dehydrated Query payload。
调整范围时应一并评估这些成本，以及分组和分页的展示语义。

## 构建与交互边界

Vite 使用 TanStack Start 的路由构建与 React hydration。
Swagger 等页面专属依赖归属对应 route，Node-only 逻辑和私密配置归属 server function。
全局 Layout、Header 和 Search 的依赖会影响多个页面的首屏，应保持依赖边界清晰。

静态资源由 `server.mjs` 托管。调整构建输出或资源缓存时，应区分带内容 hash 的构建资源和
具有稳定 URL 的图标、Skill 文件及发现文档。

## 性能评估

固定首页、资源筛选、Subject、收藏夹、详情与 API 文档作为对比路径，区分冷缓存和热缓存。
主要指标：

- HTML、server function 响应和 dehydrated Query payload 的体积；
- 路由 JS/CSS 的压缩体积与公共依赖；
- TTFB、SSR 时间、hydration 时间和 Node 内存；
- 首批、续页和后台刷新的请求次数、延迟与错误率；
- Query、API 和 CDN 的缓存命中情况。

数据加载调整以真实页面行为为验收边界：首屏范围、刷新替换、失败恢复、
旧请求取消以及滚动续页应保持一致。
