# Resources 索引补充与清理建议

日期：2026-03-22

## 背景

`resources` 表当前既承担热点读查询，也承担资源写入、去重和详情查询等路径。慢查询排查后发现，现有索引以全表单列索引为主，而实际热点读查询通常带有如下共同条件：

- `is_deleted = false`
- `duplicated_id IS NULL`
- 还会附带 `subject / type / fansub / publisher / title_search / title_alt` 等过滤
- 最终通常按 `created_at DESC` 排序分页

因此新增了一批更贴近热点查询模式的 partial index。本文用于说明：

1. 新增索引与旧索引的关系
2. 哪些旧索引建议长期保留
3. 哪些旧索引建议待观察后清理

## 全表索引与 Partial Index 的关系

带 `WHERE` 条件的 partial index 和不带 `WHERE` 的全表索引，不是完全重复关系，而是：

- 全表索引：覆盖整张表，更通用
- partial index：只覆盖热点子集，更小、更快、更贴近线上主查询

以当前 `resources` 查询为例，新增 partial index 主要覆盖这个热点子集：

```sql
is_deleted = false AND duplicated_id IS NULL
```

只要查询条件能证明自己落在这个子集里，PostgreSQL 就更倾向使用 partial index；否则仍可能使用旧的全表索引。

因此，旧索引是否能删，不应只看“列是否重复”，而应看：

- 线上是否还有重要查询依赖全表版本
- 新的 partial index 是否已经稳定接管热点查询计划

## 新增索引的定位

当前新增索引主要分三类：

### 1. 热点读查询索引

- `resources_live_created_at_index`
- `resources_live_subject_created_at_index`
- `resources_live_type_created_at_index`
- `resources_live_fansub_created_at_index`
- `resources_live_publisher_created_at_index`
- `resources_live_title_search_index`
- `resources_live_title_alt_trgm_index`

这批索引服务热点列表、搜索和筛选分页查询。

### 2. 热点去重写路径索引

- `resources_live_title_created_at_index`
- `resources_live_magnet_created_at_index`
- `resources_duplicated_id_not_null_index`

这批索引服务资源写入、更新以及 duplicated id 的维护逻辑。

### 3. 旧全表兜底索引

这些是历史上已经存在的全表索引：

- `resources_title_index`
- `resources_title_alt_index`
- `resources_magnet_index`
- `resources_publisher_id_index`
- `resources_fansub_id_index`
- `resources_subject_id_index`
- `resources_sort_by_created_at`
- `resources_title_search_index`

## 建议长期保留的索引

### `unique_resources_provider_id`

建议保留。

原因：

- `provider + providerId` 是资源详情、资源更新和 provider 相关路径的明确热点条件。
- 这是业务唯一性约束本身，不只是性能索引。

### `resources_sort_by_created_at`

当前建议保留。

原因：

- 虽然热点列表查询更偏向 `resources_live_created_at_index`
- 但全表或非 `duplicated_id IS NULL` 场景下，旧索引仍有兜底价值

这类索引可以最后再评估是否需要清理，不建议最早动它。

## 建议待观察后清理的旧索引

这些索引并不是立即必须删除，但在新索引上线并稳定运行后，大概率可以考虑清理。

### `resources_title_alt_index`

建议作为高优先级删除候选。

原因：

- 当前 `titleAlt` 读查询主要是 `ILIKE '%...%'`
- 普通 B-Tree 对这种前后通配匹配基本无效
- 新增的 `resources_live_title_alt_trgm_index` 才是对应热点查询的正确索引

### `resources_title_search_index`

建议作为高优先级删除候选。

原因：

- 搜索路径本身就带 `is_deleted = false AND duplicated_id IS NULL`
- 新增的 `resources_live_title_search_index` 更贴近真实热点
- 旧全表 GIN 只有在确实存在“搜索已删除 / 已重复资源”的需求时才更有必要

### `resources_publisher_id_index`

建议作为高优先级删除候选。

原因：

- 热点读查询不仅按 `publisher_id` 过滤，还会排序分页
- 新增的 `resources_live_publisher_created_at_index` 更贴近真实查询

### `resources_fansub_id_index`

建议作为高优先级删除候选。

原因：

- 与 `publisher_id` 类似
- 热点路径已被 `resources_live_fansub_created_at_index` 更好地覆盖

### `resources_subject_id_index`

建议作为中优先级删除候选。

原因：

- 热点读查询更适配 `resources_live_subject_created_at_index`
- 但后台管理更新、非热点路径里仍可能用到旧单列索引

比 `publisher/fansub` 更需要观察一轮。

### `resources_title_index`

建议作为中优先级删除候选。

原因：

- 它主要帮助重复检测里的 `title = ?`
- 但写路径真正的查询条件还包含：
  - `is_deleted = false`
  - `duplicated_id IS NULL`
  - `created_at < ?`
  - `ORDER BY created_at`
- 新增的 `resources_live_title_created_at_index` 更贴近真实 SQL

### `resources_magnet_index`

建议作为中优先级删除候选。

原因：

- 写路径去重更贴近 `resources_live_magnet_created_at_index`
- 而详情里的 `magnet ILIKE 'prefix%'` 查询，并不能很好地依赖当前普通 B-Tree

因此旧索引的保留价值有限，但仍建议观察后再删。

## 当前不建议优先删除的索引

### `resources_sort_by_created_at`

不建议优先删除。

原因：

- 它仍是全表按时间排序的通用兜底索引
- 即使热点读查询被 partial index 接管，也不代表所有路径都能完全由 partial index 覆盖

### `unique_resources_provider_id`

不建议删除。

原因：

- 这是唯一性约束和查询热点的结合点
- 删除没有意义

## 推荐的清理顺序

建议分两批观察和清理：

### 第一批可优先观察的删除候选

- `resources_title_alt_index`
- `resources_title_search_index`
- `resources_publisher_id_index`
- `resources_fansub_id_index`

### 第二批再评估的删除候选

- `resources_subject_id_index`
- `resources_title_index`
- `resources_magnet_index`

### 先长期保留

- `unique_resources_provider_id`
- `resources_sort_by_created_at`

## 操作建议

不要在新增索引的同时立刻删旧索引。

建议顺序：

1. 先上线新增索引。
2. 观察一段时间。
3. 使用 `EXPLAIN ANALYZE` 检查热点 SQL 是否切换到新索引。
4. 使用 `pg_stat_user_indexes` 观察旧索引是否长期低使用率。
5. 再逐步删除删除候选索引。

## 总结

当前新增的 partial index 并不是和旧索引“完全重复”，而是在热点子集上对旧索引做更精确的替代。

因此：

- 新索引应该先上
- 旧索引不应立刻删
- 但其中有相当一部分在新索引稳定接管查询后，大概率是可以清理的

优先级最高的删除候选是：

- `resources_title_alt_index`
- `resources_title_search_index`
- `resources_publisher_id_index`
- `resources_fansub_id_index`
