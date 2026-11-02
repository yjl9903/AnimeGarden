# 资源写入与版本传播

资源主写入流程位于 `apps/server/src/resources/jobs.ts`，
数据库操作位于 `src/resources/index.ts`。本文描述抓取、同步、详情回填和人工修正如何更新资源，
以及变更如何传播到查询服务。

## 服务职责

| 进程 | 主要职责 |
| --- | --- |
| 内网 `server` | 服务 Web 查询、消费资源通知、处理详情回填 |
| `cron` | 执行资源 fetch/sync、去重维护、人工修正 RPC 和推送任务 |
| public API/feed `server` | 提供公开 API、RSS 和 MCP，消费资源通知、处理详情回填 |

各进程共享 PostgreSQL，通过 Redis 传递通知、RPC 和共享缓存。
普通 server 与 cron 复用 System、模块和 Hono 路由；任务由 cron 执行，server 可通过 RPC 发起任务。
部署和域名关系见[部署拓扑](./deployment-topology.md)。

## 任务入口

`Executor` 在 cron 进程注册定时任务，通过进程内 Hono 请求调用管理路由：

| 任务 | 周期 | 管理入口 | 执行函数 |
| --- | --- | --- | --- |
| fetch | 每 5 分钟 | `/admin/resources/:provider` | `runFetchJob()` |
| sync | 每小时 | `/admin/resources/:provider/sync` | `runSyncJob()` |

`ResourcesJobCoordinator` 按 provider 协调 fetch/sync。
已有任务运行时返回 `already_running`，接受新任务时返回 `queued`，任务结束后释放运行标记。

## 抓取批次与时间字段

fetch 和 sync 在任务开始时创建一个 `fetchedAt`，同一批资源使用该值。
批次发生资源或重复关系变化时，provider 的 refreshedAt 也更新为同一个 fetchedAt。

| 字段 | 写入规则 |
| --- | --- |
| `createdAt` | 上游资源发布时间 |
| `fetchedAt` | 当前抓取批次时间；资源内容变化时更新 |
| `indexedAt` | 首次插入时取 fetchedAt，后续更新保留 |
| provider `refreshedAt` | 有变更的抓取批次时间 |

查询使用 `indexedAt <= anchor` 限定可见入库范围，
使用 provider timestamp 区分缓存代际，详见[资源查询与缓存](./resources-query.md)。

资源大小在 PostgreSQL 和内部缓存中以 KiB 保存，
由 `QueryManager.transform()` 统一转换成 bytes 后输出给 API、详情、收藏夹、RSS 和 MCP。

## 共用 upsert

fetch 与 sync 都调用 `upsertResources()`：

1. 按 `(provider, providerId)` 对输入去重。
2. `ensureParties()` 补齐发布者与字幕组。
3. 转换标题、大小、分词、Subject 及资源字段。
4. 批量读取已有资源，区分插入与更新。
5. 新资源执行 `INSERT ... ON CONFLICT DO NOTHING`。
6. 已有资源比较删标、链接、magnet、tracker、Subject、party 和标题字段，仅写入变化部分。
7. 返回 inserted、updated、changed 和转换失败的 errors。

Subject 自动匹配优先更新为新的非空匹配结果。
重新匹配为空时保留已有 Subject；显式设置 `resetSubjectId: true` 可清空。

## Fetch 流程

1. provider 的 `fetchLatestResources()` 抓取最新资源。
2. 转为统一 NewResource，按发布时间排序后执行 upsert。
3. 对 changed 资源维护重复关系。
4. 有变更时更新 provider refreshedAt，并发送一份资源通知。
5. 新插入资源进入 Telegram 推送队列，同时补偿失败推送。

## Sync 流程

1. provider 的 `fetchResourcePages(start, end)` 抓取指定页区间。
2. 使用相同 upsert 流程插入新资源、更新已有资源。
3. `markDeletedResources()` 根据抓取窗口标记已从上游消失的资源。
4. 汇总 upsert 和删标涉及的 ID，统一维护重复关系。
5. 有变更时更新 provider refreshedAt，发送包含插入、更新、删除和重复关系变化的通知。

删除采用 `isDeleted` 逻辑标记。重复关系维护负责处理根资源与重复资源的附着、脱离，
列表查询默认展示未删除的根资源。

## 变更传播

通知结构包含：

```text
resources.inserted
resources.updated
resources.deleted
duplicated.attached
duplicated.detached
```

cron 通过 Redis `NOTIFY_CHANNEL` 发布；server 订阅后调用 `System.refresh()`，按模块顺序刷新。
providers 重读版本后，resources 清空本地精确查询 Task。
provider timestamp 推进时，后续查询同时切换 Redis 缓存代际。

ProvidersModule 每 60 秒轮询数据库，补充通知驱动的版本刷新。
Redis 离线时服务继续查询数据库，通知和 RPC 等待连接恢复；
provider 轮询负责更新该模块的快照，其他模块仍按各自刷新机制维护。

## 详情回填

详情请求经过 `DetailsManager.getByProviderId()` 或 `getByInfoHash()`：

1. 读取 Redis detail cache、resources 和 details。
2. detail 缺失、过期或资源删标时回源抓取。
3. 将抓取结果写入 details，并填充 Redis detail cache。
4. `fixResourceWithDetail()` 补充 magnet、tracker、party 头像及标准化资源信息。

因此普通 server 在详情查询中也会写入 details、resources、users 或 teams。
资源详情回填与定时批次写入分别由 DetailsManager 和资源任务维护。

DMHY 数字 ID 先查询 resources 以补全详情 URL。资源不存在返回 404；
数据库错误向上层传播为 5xx。详情路由 memo 缓存正常结果，异常后的请求重新查询。

## 人工修正 Subject 与详情

管理接口通过 Bearer secret 鉴权，交由 cron RPC 执行：

```http
PATCH /admin/resources/:provider/:providerId
Content-Type: application/json

{ "subjectId": 123, "detail": true }
```

manager CLI：

```bash
pnpm manager admin patch <provider> <provider-id> \
  [--subject <subject-id>] [--detail] --url <api-base-url>
```

- `--subject` 与 `--detail` 至少指定一个。
- Subject 必须存在于本地 subjects 表；修改写入资源的 subject_id。
- `detail: true` 清理 Redis detail cache，立即重新抓取详情。
- Subject 修改后清理对应 detail cache，并广播 `resources.updated` 通知。
- 详情路由进程内 memo 最长保留 1 小时。
- cron 不可用时返回 503。

manager 从环境变量或 `.env` 读取 `ADMIN_SECRET`，兼容回退到 `SECRET`。
共享终端中应通过环境提供密钥。`--url` 省略时使用 client 默认地址。
人工 Subject 绑定仍参与后续自动匹配；后续非空匹配结果可以覆盖该值。

## 维护入口

| 事项 | 位置 |
| --- | --- |
| 抓取、同步、RPC 协调 | `apps/server/src/resources/jobs.ts` |
| Upsert、删标、人工绑定 | `apps/server/src/resources/index.ts` |
| 入库转换与 indexedAt | `apps/server/src/resources/transform.ts` |
| 详情回填 | `apps/server/src/resources/details.ts` |
| 版本快照 | `apps/server/src/providers/module.ts` |
| 通知发布和模块刷新 | `apps/server/src/system/system.ts` |
| 推送状态机 | [Telegram 推送](./telegram-push-flow.md) |
