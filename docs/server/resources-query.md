# 资源查询与缓存

资源查询由 `apps/server/src/resources/query.ts` 实现。
接口和 cursor 编码见[分页契约](../client/pagination.md)，
数据写入与版本来源见[资源写入链路](./resources-write-flow.md)。

## 查询流程

```text
HTTP 参数
  → parseResourcesQuery
  → QueryManager.find
  → 精确查询 Task
  → RedisQueryCache
  → PostgreSQL
  → 按请求 limit 切片、生成 nextCursor、转换响应
```

resources 与 feed 共用 `parseResourcesQuery()`：

1. 使用 client parser 归一化筛选和数量。
2. 检查已停用的 page/pageSize 参数。
3. 解码 cursor，生成服务端 `ResolvedPaginationOptions`。

```ts
interface ResolvedPaginationOptions {
  limit: number;
  cursor?: ResourceCursor;
}
```

`QueryManager.find(filter, pagination)` 消费解析后的输入。缺省 cursor 使用当前 provider timestamp
作为 anchor。fansub、publisher 名称在查询前转为内部 ID；无法识别的名称会被丢弃，
全部名称都无法识别时，该类筛选按空条件处理。

## 数据选择与分页

筛选条件在 PostgreSQL 执行。首批与续页共用以下查询规则：

```sql
WHERE is_deleted = false
  AND indexed_at <= :anchor
  AND /* provider、subject、type、party、标题及时间筛选 */
  /* 有 position 时追加：AND (created_at, id) < (:created_at, :id) */
ORDER BY created_at DESC, id DESC
LIMIT 1001
```

默认筛选重复资源的根节点，即 `duplicated_id IS NULL`；duplicate 选项控制是否包含重复资源。
标题全文查询、关键词和 preset 约束在同一条 SQL 中组合。

底层批次大小固定为 `MaxResourcesLimit + 1`，当前为 1001。
请求 limit 决定返回的切片长度；底层结果多于 limit 时，使用切片最后一条资源的
`createdAt + id` 生成 nextCursor，否则返回 `nextCursor: null`、`complete: true`。

数据库层使用 Date 表示时间，cursor 使用 Unix 毫秒数。
`QueryManager.transform()` 将数据库资源转换为 API 表示，包括将内部 KiB 大小转换为 bytes。

## 缓存标识

Task 与 Redis 使用相同的查询标识：

```text
hash({
  filter: 数据库筛选条件,
  cursor: { anchor, position? },
  providerTimestamp: 当前 provider timestamp
})
```

anchor 表示分页可见的入库范围，providerTimestamp 表示当前缓存代际。
同一位置、不同 limit 的请求共享最大批次，因此 limit 在响应切片阶段处理。

## 进程内 Task

一个 Task 保存一条精确查询的进行中 Promise 和完成后的结果。
相同查询的并发请求复用该 Promise，完成后复用该批资源。

| 配置 | 值 |
| --- | --- |
| 最大 Task 数量 | 100 |
| TTL | 2 小时，自创建计时 |
| 淘汰策略 | LRU，过期自动清理 |
| 清理动作 | `dispose` 调用 `Task.clear()` |

清理时增加 Task 内部 revision 并释放结果。已发出的查询可以完成原调用，
但只在 revision 一致时写入 Task。

## RedisQueryCache

`RedisQueryCache` 与 `QueryManager` 位于同一文件，负责 key、序列化、TTL 和故障隔离。
Redis key 为 `animegarden:resources:query:<hash>`。

| 行为 | 规则 |
| --- | --- |
| 读取 | 命中后恢复资源；未命中时查询 PostgreSQL |
| TTL | 5 分钟 |
| 可用性 | Redis ready 时执行读写 |
| 操作超时 | 500ms |
| 故障冷却 | 30 秒内绕过 Redis |
| 写回 | 数据库查询成功后后台执行 |

一次缓存访问捕获同一个 key，读取与写回使用相同代际。
缓存行和数据库行共用 `hydrateResources()`，恢复 createdAt、fetchedAt、indexedAt，
并对标题、magnet、tracker 使用字符串池。

## 版本刷新与缓存失效

资源通知触发模块顺序刷新：providers 先重读 provider 状态，resources 随后清空 Task。
provider timestamp 推进后，新查询使用新的 Task/Redis 标识；旧 Redis 条目按 TTL 淘汰。

`ProvidersModule` 在启动、通知和写入后读取 provider 快照，并每 60 秒轮询数据库。
读取串行执行，轮询遇到正在进行的读取时跳过该轮；失败保留上次成功的快照。
轮询更新的 provider timestamp 同样参与后续查询的缓存标识。

## 慢查询隔离

默认数据库连接发生 statement timeout 时，资源查询转入专用慢查询连接。
慢查询通道使用进程内互斥和 PostgreSQL advisory lock 控制并发：

- 通道繁忙返回 503。
- 慢查询再次超时返回 504。
- 锁在查询结束后释放。

HTTP 层统一将查询错误转换为资源 JSON 或 feed XML，并设置 `Cache-Control: no-store`。

## HTTP 缓存

资源列表路由根据已解析的 cursor 选择缓存档位：

| 请求 | Cache-Control |
| --- | --- |
| 省略 cursor | `public, max-age=60, stale-while-revalidate=300` |
| cursor 仅含 anchor | `public, max-age=600, stale-while-revalidate=3600` |
| cursor 含 position | `public, max-age=1800, stale-while-revalidate=86400` |

CDN 缓存键需覆盖筛选条件、cursor、limit、tracker、metadata 等影响响应的参数。
Web 的 SSR 与 server function 缓存独立配置，见[前端性能与缓存](../web/performance.md)。

## 维护入口

| 事项 | 位置 |
| --- | --- |
| HTTP 参数解析与错误映射 | `apps/server/src/server/utils/resources-query.ts` |
| 查询、Task、Redis 缓存 | `apps/server/src/resources/query.ts` |
| Cursor 编解码 | `packages/shared/src/cursor.ts` |
| Provider 版本刷新 | `apps/server/src/providers/module.ts` |
| SQL 索引 | [资源索引](./resources-indexes.md) |

查询性能关注 Task/Redis 命中率、数据库 p95/p99、statement timeout 和慢通道 busy 数量。
执行计划应覆盖首批、深 cursor、旧 anchor 及常用筛选组合。
