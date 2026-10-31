# @animegarden/web 文档索引

本目录记录 `apps/web` 的路由、数据状态、页面交互、缓存和输出契约。

## 架构总览

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [architecture-overview.md](./architecture-overview.md) | Web 应用运行形态、TanStack Start 路由、数据加载、feed/sitemap、状态和样式目录导览 | 新介入前端代码、调整页面结构或评估影响范围时先读 |
| [../server/deployment-topology.md](../server/deployment-topology.md) | 线上域名、Fly app、内网后端与 public API 服务关系 | 排查线上可用性或调整跨服务调用时先读 |

## 资源查询与页面行为

| 文档 | 内容 |
| --- | --- |
| [分页契约](../client/pagination.md) | API 字段、内部 cursor 与 SDK 聚合 |
| [资源查询与分页](./resources-pagination.md) | Query key、版本旁路、首批刷新、续页和页面规则 |
| [性能与缓存](./performance.md) | Query 新鲜度、HTTP 缓存、页面数据范围与评估指标 |

## 输出与事件

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [umami-tracking.md](./umami-tracking.md) | Umami 事件、字段、触发时机和接入位置 | 修改前端交互或埋点时先读 |
| [google-search-seo-plan.md](./google-search-seo-plan.md) | 页面文案、索引白名单、canonical、robots 与 Sitemap | 修改 SEO 输出或搜索展示时先读 |

## 维护约定

- 前端布局与文案遵循 [前端开发规范](../../apps/web/AGENTS.md)：避免不必要的次级标签和说明，让布局本身表达关系与操作。

- 新增埋点时记录事件名、触发场景、属性和接入位置。
- 同类行为优先复用统一事件名和属性结构。
- 调整用户流程、运行时适配或入口时，同步检查是否需要更新架构和埋点说明。
