# @animegarden/server 架构总览

检查日期：2026-05-08

## 定位

`apps/server` 是 AnimeGarden 的后端应用。它同时提供 HTTP API、RSS / sitemap、MCP、资源抓取与同步任务、资源详情回填、Telegram 推送和数据库迁移 CLI。部署上主要分为普通 `server` 和 `cron` 两类进程；代码上二者复用同一套 `System`、模块和 Hono 路由。

## 启动链路

| 入口 | 代码 | 职责 |
| --- | --- | --- |
| `cli start` | `src/cli.ts` -> `makeSystem()` -> `makeServer()` | 启动普通 Hono 服务，profile 为 `server` |
| `cli cron` | `src/cli.ts` -> `makeSystem()` -> `makeExecutor()` | 注册资源 fetch / sync cron，可选监听 HTTP |
| `migrate` | `src/cli.ts` -> `connect/migrate.ts` | 执行 Drizzle 迁移 |
| `telegram push` | `src/cli.ts` -> `modules.push` | 手动推送指定资源或 subject |

`makeSystem()` 负责连接 Postgres、Redis，注册模块，并按 `profile` 配置连接参数。普通 `server` 进程会额外创建 `resources-slow` 数据库连接，用于资源慢查询隔离。

## 核心运行模型

`System` 是后端的应用容器，位于 `src/system/`。它负责：

- 保存数据库、Redis、logger、运行选项和模块实例。
- 统一执行模块 `initialize()`、`import()`、`refresh()`。
- 在 `cron` 与普通 `server` 之间通过 Redis 发布资源变更通知。
- 提供 RPC bus，让普通服务可以请求 `cron` 执行资源任务。

模块都继承 `src/system/module.ts` 的 `Module`，当前注册模块包括 `providers`、`users`、`teams`、`resources`、`collections`、`tags`、`subjects`、`push`。

## HTTP 与任务入口

Hono 入口在 `src/server/index.ts`。`registerHono()` 统一绑定：

- 请求 id、响应时间、JSON charset、CORS、logger、60s timeout。
- `/` 和 `/health` 状态接口。
- `users`、`subjects`、`resources`、`collections`、`feed`、`admin`、`sitemaps` 路由。
- 查询错误到 JSON / XML 的统一转换。

`makeServer()` 额外注册 `/mcp`，并将 `/.well-known/mcp/server-card.json` 重定向到 Web 站点；`makeExecutor()` 额外注册资源任务 RPC，并由 `Executor.start()` 注册每 5 分钟 fetch、每小时 sync 的 cron job。

## 代码逻辑分类

| 目录 | 主要职责 |
| --- | --- |
| `src/connect/` | Postgres、Redis、迁移连接 |
| `src/schema/` | Drizzle 表、关系和类型导出 |
| `src/server/routes/` | HTTP 路由定义 |
| `src/resources/` | 资源查询、写入、去重、详情回填、任务执行 |
| `src/providers/` | provider 状态和 scraper 适配 |
| `src/subjects/` | Bangumi subject 导入、索引和 calendar 维护 |
| `src/push/` | Telegram 消息状态机、过滤、消息构造和发送队列 |
| `src/users/` | 发布者和字幕组缓存 / 查询 |
| `src/collections/` | 收藏夹生成和读取 |
| `src/server/rss/`、`src/server/sitemap/` | RSS 与 sitemap 输出 |
| `src/server/mcp/` | MCP 服务封装 |
| `src/utils/` | 缓存、数据库重试、jieba、bgmd、时间等工具 |

## 资源主链路

资源主写链路在 `src/resources/jobs.ts`：

1. `runFetchJob()` 抓最新资源，执行 `upsertResources()`，维护重复链，发布通知，并异步触发 Telegram 推送。
2. `runSyncJob()` 抓指定页区间，执行 upsert、删标、重复链维护和通知。
3. `ResourcesModule` 负责确保发布者 / 字幕组存在、转换资源、插入或更新 DB、维护 duplicated 关系。
4. `QueryManager` 负责资源列表查询、Task 预取缓存、Redis / 精确查询缓存、通知后的缓存刷新。
5. `DetailsManager` 负责 detail cache、详情回源和必要的资源回填修正。

更细的 resources 写入、查询和索引背景见本目录其他文档。

## 修改入口建议

- 改 API 响应或路由：先看 `src/server/routes/`，再看对应模块。
- 改资源列表筛选：先看 `src/resources/query.ts`、`filter.ts` 和 `docs/server/resources-query-task-review.md`。
- 改抓取 / 同步：先看 `src/resources/jobs.ts`、`src/providers/` 和 `docs/server/resources-write-flow.md`。
- 改 Telegram：先看 `src/push/` 和 `docs/server/telegram-push-flow.md`。
- 改表结构：先看 `src/schema/`、`drizzle/`，并补充迁移影响说明。
