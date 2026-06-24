# 资源列表 Anchor + Cursor 缓存实现方案

状态：尚未实现, 方案草案，供 TanStack Start 迁移和后端资源接口改造时使用。

对应 issue：[yjl9903/AnimeGarden#1752](https://github.com/yjl9903/AnimeGarden/issues/1752)

## 目标

资源列表从传统 page / offset 分页改为 `anchor + cursor` 模型：

```text
anchor = 后端资源数据版本 timestamp
cursor = createdAt + id 翻页位置
```

目标：

- 站内搜索、筛选、跳转资源列表首页时尽量命中稳定缓存。
- 直接链接打开资源列表时仍然获取较新的首页。
- 后续页 URL 由稳定 cursor 表达，适合 CDN 缓存。
- TanStack Query 可以使用 `useInfiniteQuery` 自然建模。
- 避免 offset / page 分页因新资源插入导致页面位移。

## 术语

### anchor

`anchor` 是后端资源数据版本 timestamp，来源于当前接口响应里的 `timestamp`。当前后端该值来自 `sys.modules.providers.timestamp`，即所有 provider `refreshedAt` 的最大值。

前端维护：

```text
currentResourceAnchor = response.timestamp
```

### cursor

`cursor` 是资源列表内的翻页锚点，由最后一条资源的排序键生成：

```text
cursor = createdAt + id
```

cursor 必须由服务端生成，客户端只透传，不自行构造。编码需要 deterministic，同一组 `{ createdAt, id }` 永远生成同一个 cursor。

### indexedAt

`indexedAt` 是资源首次进入 AnimeGarden 索引的时间，用于判断某条资源是否在某个 `anchor` 数据版本中可见。

字段语义：

```text
createdAt  = 上游资源发布时间，用于业务排序
fetchedAt  = 最近一次抓取或更新时间
indexedAt  = 首次进入 AnimeGarden 索引时间，用于 anchor 可见性
```

## 数据模型改造

在 `resources` 表新增字段：

```text
indexed_at timestamp with time zone not null
```

写入规则：

- 插入资源时：`indexedAt = fetchedAt`。
- 更新资源时：只更新 `fetchedAt`，不更新 `indexedAt`。
- 历史资源回填：初期可使用 `indexedAt = fetchedAt`。

### sync 时间戳修复

`apps/server/src/resources/jobs.ts` 中 `runSyncJob()` 当前会创建 `fetchedAt = new Date()` 并写入资源，但同步结束后更新 provider refresh timestamp 时使用新的 `new Date()`。

建议改为使用同一个 `fetchedAt`：

```text
updateRefreshTimestamp(platform, fetchedAt)
```

这样 fetch / sync 路径保持一致，资源批次时间、provider timestamp 和 API response `timestamp` 语义统一。

## API 设计

资源列表 API 支持三种请求形态：

```text
GET /api/resources?type=动画&preset=bangumi
GET /api/resources?type=动画&preset=bangumi&anchor=2026-06-13T10:20:00.000Z
GET /api/resources?type=动画&preset=bangumi&anchor=2026-06-13T10:20:00.000Z&cursor=...
```

语义：

```text
不带 anchor，不带 cursor:
  最新首页，适合直接打开和首次进入，短缓存。

带 anchor，不带 cursor:
  指定数据版本下的首页，适合站内搜索、筛选、跳转，中长缓存。

带 anchor + cursor:
  指定数据版本下的后续页，适合 cursor 翻页，长缓存。
```

响应结构建议：

```json
{
  "status": "OK",
  "timestamp": "2026-06-13T10:20:00.000Z",
  "resources": [],
  "pagination": {
    "nextCursor": "...",
    "complete": false
  },
  "filter": {}
}
```

`timestamp` 继续使用后端 provider timestamp，并作为前端下一次站内跳转的 `currentResourceAnchor` 来源。

## 查询语义

基础过滤继续保留当前资源列表语义：

```sql
WHERE is_deleted = false
  AND duplicated_id IS NULL
  AND filters...
```

带 `anchor` 时增加：

```sql
AND indexed_at <= anchor
```

排序固定为：

```sql
ORDER BY created_at DESC, id DESC
```

带 `cursor` 时增加 keyset 条件：

```sql
AND (
  created_at < cursorCreatedAt
  OR (created_at = cursorCreatedAt AND id < cursorId)
)
```

请求时多取一条判断是否还有下一页：

```sql
LIMIT pageSize + 1
```

如果返回数量大于 `pageSize`，截断到 `pageSize` 并使用最后一条实际返回资源生成 `nextCursor`。

## 缓存策略

HTML 页面入口：

```text
/resources?...
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

资源 API 最新首页：

```text
/api/resources?filter...
Cache-Control: public, max-age=60~300, stale-while-revalidate=300~1800
```

资源 API 指定 anchor 首页：

```text
/api/resources?filter...&anchor=...
Cache-Control: public, max-age=600, stale-while-revalidate=3600
```

资源 API cursor 后续页：

```text
/api/resources?filter...&anchor=...&cursor=...
Cache-Control: public, max-age=1800, stale-while-revalidate=86400
```

实际缓存时长可以根据线上更新频率和 Cloudflare 命中情况调整。

## Cloudflare Cache Key

Cloudflare cache key 需要规范化：

- query params 排序。
- 多值参数排序，例如多个 `type`、`fansub`、`publisher`。
- 去掉默认值，例如默认 `pageSize`。
- `anchor`、`cursor`、`tracker`、`metadata` 等影响响应内容的参数必须进入 cache key。
- cursor 编码必须 deterministic。
- 不应把用户态、随机值或请求时间写入资源 API cache key。

## 前端行为

### 直接链接打开

用户直接打开：

```text
/resources?type=动画
```

HTML 页面走短缓存。首次资源 Query 可以不带 `anchor`，获取最新首页。

### 站内跳转

站内搜索、筛选或跳转资源列表首页时，页面 URL 仍然保持干净：

```text
/resources?type=动画
```

但资源 API 请求默认带上当前 anchor：

```text
/api/resources?type=动画&anchor=currentResourceAnchor
```

这样同一数据版本下的 filter 首页也能命中稳定缓存。

### 后续翻页

后续页通过 cursor 加载：

```text
/api/resources?type=动画&anchor=currentResourceAnchor&cursor=nextCursor
```

### TanStack Query 建模

使用 `useInfiniteQuery`：

```text
queryKey = ['resources', normalizedFilter, currentResourceAnchor]
initialPageParam = undefined
getNextPageParam = lastPage.pagination.nextCursor
```

资源 API 每次返回新的 `timestamp` 后，前端更新：

```text
currentResourceAnchor = response.timestamp
```

## 路由调整

下掉分页模式页面路由：

```text
/resources/1
/resources/2
/resources/:page
```

改为 filter-only 页面入口：

```text
/resources?type=动画
/resources?fansub=ANi
/resources?subject=513018
```

第一页作为 canonical。后续页不再生成传统页面 URL，客户端通过 cursor 加载。

## 与严格历史 Snapshot 的区别

本方案不是完整历史回放。

`indexedAt <= anchor` 只固定“资源首次进入索引”的边界。查询仍然使用当前状态：

```sql
is_deleted = false
duplicated_id IS NULL
```

因此它不会回放历史删除状态，也不会回放历史去重状态。

这个取舍适合资源列表缓存和翻页稳定性；如果未来需要严格历史 snapshot，需要额外设计资源可见性版本、删除版本和去重版本。

## 实施顺序建议

1. 新增 `indexed_at` 字段并回填历史数据。
2. 修复 `runSyncJob()` 中 provider refresh timestamp 使用不同 `Date` 的问题。
3. 后端资源查询支持 `anchor` 和 keyset `cursor`。
4. API 响应增加 `pagination.nextCursor`。
5. API 按最新首页、anchor 首页、cursor 后续页分别设置缓存策略。
6. 前端维护 `currentResourceAnchor`。
7. 资源列表迁移到 TanStack Query `useInfiniteQuery`。
8. 下掉 `/resources/:page` 页面路由，改为 filter-only 入口。
9. 配置 Cloudflare cache key 规范化。
10. 观察命中率、TTFB、origin 请求量、列表 payload 和查询耗时。
