# 资源索引与分页字段

索引定义以 `apps/server/src/schema/resources.ts` 为准。
资源查询语义见[资源查询与缓存](./resources-query.md)。

## 时间字段与稳定排序

| 字段 | 含义 |
| --- | --- |
| `created_at` | 上游发布时间 |
| `fetched_at` | 最近一次写入或更新使用的抓取批次时间 |
| `indexed_at` | 首次入库时间，插入时取 fetched_at，更新时保留 |

三个字段均为 `NOT NULL`。分页通过 `indexed_at <= anchor` 固定入库范围，
通过 `(created_at, id)` 定位下一批，排序为：

```sql
ORDER BY created_at DESC, id DESC
```

id 是相同发布时间下的唯一排序键。
B-tree 排序后缀统一使用 `created_at DESC NULLS FIRST, id DESC NULLS FIRST`，
与 Drizzle `desc()` 生成的 PostgreSQL 排序一致。

## 唯一性与通用索引

| 索引 | 作用 |
| --- | --- |
| `resources_pkey` | 资源主键 |
| `unique_resources_provider_id` | `(provider_name, provider_id)` 唯一性 |
| `resources_magnet_index` | 去重逻辑的 magnet 精确匹配 |
| `resources_publisher_id_index` | 发布者筛选及维护 |
| `resources_fansub_id_index` | 字幕组筛选及维护 |
| `resources_subject_id_index` | Subject 查询、推送和批量维护 |
| `resources_sort_by_created_at` | 全量资源的稳定时间排序 |
| `resources_provider_created_at_id_index` | 未删除资源的 provider 列表和同步时间范围查询 |
| `resources_title_search_index` | 全量资源的 title_search 全文搜索 |

provider 索引以 provider_name 为前缀、稳定排序键为后缀，predicate 为 `is_deleted = false`。
全量索引支持包含重复资源的查询。

## Live-root partial indexes

默认资源列表使用以下 predicate：

```sql
WHERE is_deleted = false AND duplicated_id IS NULL
```

| 索引 | 前缀或索引类型 |
| --- | --- |
| `resources_live_created_at_index` | 稳定排序键 |
| `resources_live_subject_created_at_index` | subject_id + 稳定排序键 |
| `resources_live_type_created_at_index` | type + 稳定排序键 |
| `resources_live_fansub_created_at_index` | fansub_id + 稳定排序键 |
| `resources_live_publisher_created_at_index` | publisher_id + 稳定排序键 |
| `resources_live_title_search_index` | title_search GIN |
| `resources_live_title_alt_trgm_index` | title_alt 的 gin_trgm_ops，支持 ILIKE 子串查询 |

Subject 和 fansub 复合索引分别追加对应 ID 非空的 predicate。
包含重复资源和默认隐藏重复资源的全文查询分别使用全量、live-root 两套 GIN 索引。

## 迁移与维护

`apps/server/drizzle/0008_resources-index-audit.sql`：

1. 添加 indexed_at，以已有 fetched_at 回填，设置默认值和非空约束。
2. 重建稳定排序索引，补齐 provider 复合索引。
3. 删除已脱离查询路径的 title B-tree、旧去重索引。

当前 Drizzle migrator 在事务中执行迁移，SQL 使用普通 `DROP INDEX` / `CREATE INDEX`。
执行窗口需要考虑写锁与索引重建的磁盘峰值。需要在线 concurrent 重建时，应使用独立于
事务型 migrator 的分阶段迁移流程。

索引维护以 schema 和迁移定义为基准，结合 `EXPLAIN (ANALYZE, BUFFERS)` 检查：

- 首页、provider、subject、type、fansub、publisher 筛选的排序扫描。
- 深 cursor 与旧 anchor 下的候选行数量、过滤比例和 LIMIT 成本。
- 全文及 ILIKE 查询的索引选择。
- 索引扫描频率、体积及写入开销。
