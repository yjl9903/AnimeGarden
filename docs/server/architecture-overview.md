# Server 架构总览

`apps/server` 提供资源 API、RSS、sitemap 数据、MCP、资源抓取与同步、
详情回填、Telegram 推送及数据库迁移 CLI。
普通 server 和 cron 进程复用 System、模块与 Hono 路由，
部署关系见[部署拓扑](./deployment-topology.md)。

## 启动与运行角色

| 入口 | 调用链 | 职责 |
| --- | --- | --- |
| `cli start` | `makeSystem()` → `makeServer()` | 启动普通 Hono 服务，profile 为 server |
| `cli cron` | `makeSystem()` → `makeExecutor()` | 注册 fetch/sync 定时任务和资源 RPC，可选 HTTP |
| `migrate` | `connect/migrate.ts` | 执行 Drizzle 迁移 |
| `telegram push` | `modules.push` | 推送指定资源或 Subject |

`makeSystem()` 连接 PostgreSQL、配置 Redis 并注册模块。
普通 server 额外创建 resources-slow 数据库连接，隔离资源慢查询。
Redis 在后台连接和重试；可用时提供共享缓存、通知和跨进程 RPC。

## System 与模块

`src/system/` 保存连接、配置、logger 和模块实例，
统一执行模块的 initialize、import、refresh，并管理关闭时的清理。

| 模块 | 主要职责 |
| --- | --- |
| providers | provider 状态、数据版本和 scraper 适配 |
| users / teams | 发布者、字幕组与别名 |
| resources | 写入、查询、重复关系和详情回填 |
| collections | 收藏夹保存和读取 |
| tags | 标签 |
| subjects | Bangumi 资料、索引和周历 |
| push | Telegram 推送状态机与发送队列 |

providers 在启动、通知和写入后刷新快照，并每 60 秒轮询数据库。
快照读取串行执行，失败保留上次成功结果；定时器随 System 关闭清理。

## 资源数据流

1. cron 抓取或同步上游资源，统一执行 upsert、删标与重复关系维护。
2. 有变更的抓取批次更新 provider refreshedAt，并发布资源通知。
3. server 消费通知，按模块顺序刷新 provider 快照和资源查询缓存。
4. 资源请求解析筛选与 cursor，通过 Task、Redis 和 PostgreSQL 获取精确批次。
5. 结果按请求 limit 切片、生成 nextCursor，再转换成 API 表示。

| 专题 | 内容 |
| --- | --- |
| [资源写入](./resources-write-flow.md) | 批次版本、upsert、删标、详情及人工修正 |
| [资源查询](./resources-query.md) | 参数边界、keyset SQL、Task、Redis、慢查询 |
| [资源索引](./resources-indexes.md) | 稳定排序、partial index、indexed_at 迁移 |
| [分页契约](../client/pagination.md) | API、SDK 与 shared codec |

## HTTP 边界

`src/server/index.ts` 的 `registerHono()` 统一配置请求 ID、时间戳、JSON charset、
CORS、logger、60 秒 timeout 和查询错误响应。
API 响应携带 `X-Robots-Tag: noindex`；错误响应使用 `Cache-Control: no-store`。

路由包括状态与 health、users、subjects、resources、collections、feed、admin 和 sitemaps。
`makeServer()` 额外提供 `/mcp`，并将 MCP server card 发现地址重定向到 Web。
`makeExecutor()` 注册资源任务 RPC。

`/sitemaps/*` 是 Web 站点地图的数据源。源契约保存在 Web 的 OpenAPI spec，
公开 `/openapi.json` 由 `getPublicOpenApiSpec()` 过滤后输出。

| 内部接口 | 返回内容 |
| --- | --- |
| `GET /sitemaps/subjects` | 所有 Subject 的 id、activedAt、isArchived |
| `GET /sitemaps/{year}/{month}` | 上海时区月份内未删除根资源的数量、标识和 fetchedAt |

月份接口支持 2020 年至当前年月。数字参数越界或查询失败返回 HTTP 200、
`status: ERROR` 和空 resources；非数字路径按路由匹配处理。

## 代码导航

| 目录 | 职责 |
| --- | --- |
| `src/connect/` | PostgreSQL、Redis、迁移连接 |
| `src/schema/`、`drizzle/` | 表结构、索引与迁移 |
| `src/server/routes/` | HTTP 路由 |
| `src/resources/` | 资源读写、详情和任务 |
| `src/providers/` | provider 快照与抓取适配 |
| `src/subjects/` | Bangumi 导入、索引与周历 |
| `src/users/` | 发布者和字幕组缓存 |
| `src/collections/` | 收藏夹 |
| `src/push/` | 推送过滤、消息与状态机 |
| `src/server/rss/`、`src/server/sitemap/`、`src/server/mcp/` | 输出格式与协议 |
| `src/utils/` | 数据库重试、分词、时间和公共工具 |

番剧资料见[Subject 数据源](./subject-data-source.md)，
推送见[Telegram 流程](./telegram-push-flow.md)，
party 写入与别名见[名称归一化](./party-normalization.md)。
