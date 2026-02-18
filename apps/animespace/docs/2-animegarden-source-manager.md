# AnimeGarden Source Manager（当前实现快照）

本文档描述 `apps/animespace/src/subject/animegarden/manager.ts` 与相关 SQLite 模块的当前行为，不再描述“计划中”接口。

## 1. 代码落点

1. `apps/animespace/src/subject/animegarden/manager.ts`
2. `apps/animespace/src/sqlite/connect.ts`
3. `apps/animespace/src/sqlite/animegarden.ts`
4. `apps/animespace/src/sqlite/metadata.ts`
5. `apps/animespace/src/system/system.ts`

## 2. 当前对外接口

`AnimeGardenSourceManager` 当前提供以下接口：

1. `initialize(): Promise<void>`（memoized）
2. `fetchResources(filter?: FilterOptions, forceRefresh?: boolean): Promise<FetchResourcesResult<{ tracker: true }>>`
3. `transformSubjectResource(resource): SubjectResource`
4. `close(): void`

说明：

1. 当前不存在独立 `refresh(filter)` 方法。
2. 强制刷新通过 `fetchResources(filter, true)` 实现。

## 3. 初始化流程

初始化由 `initialize` 执行，核心逻辑：

1. 读取 metadata `animegarden_synced_at`。
2. 读取本地最新 `animegarden_resources`（按 `createdAt desc, fetchedAt desc`）。
3. 若本地存在资源且距离上次同步小于 2 分钟，跳过同步，只更新 `latestFetchedAt`。
4. 若本地无资源或资源最晚 `createdAt` 超过 7 天：清空 `resources + filters + filter_resources`。
5. 调用 `syncLatestResources` 拉取最新资源并 upsert。
6. 写入 metadata `animegarden_synced_at = now`。

## 4. 查询与缓存命中

`fetchResources` 的查询流程：

1. 先执行 `initialize()`。
2. 用 `parseURLSearch + stringifyURLSearch` 生成标准 filter key。
3. 读取 `animegarden_filters` 与关联 `animegarden_filter_resources`。
4. 若满足以下条件直接命中缓存：
   - `forceRefresh = false`
   - filter 记录存在
   - `hasNewMatchedResources(...) === false`
5. 未命中时远程调用 `@animegarden/client.fetchResources({ ...filter, tracker: true })`。
6. 远程成功后 upsert `animegarden_resources`，并重建 `filter -> resources` 关系（先删后插）。

错误策略：

1. 远程 `ok=false` 直接抛错。
2. 数据库异常直接上抛。

## 5. 资源同步策略

`syncLatestResources` 行为：

1. 同步时固定查询 `type: '动画'`、`tracker: true`。
2. 每页 `pageSize = 1000`，从第 1 页开始。
3. 连续 1 页无缺失资源则提前停止。
4. 最大抓取页数阈值为 10；超过后会清空 filters 缓存关系。

## 6. 数据库表与索引（当前 schema）

来自 `apps/animespace/src/sqlite/animegarden.ts`：

1. `animegarden_resources`
   - 唯一索引 `(provider_name, provider_id)`
   - 索引 `created_at`, `fetched_at`
2. `animegarden_filters`
   - 唯一键 `key`
3. `animegarden_filter_resources`
   - 唯一索引 `(filter_id, resource_id)`

## 7. 与 System 的集成

1. `System.loadSpace()` 会创建 `system.managers.animegarden`。
2. manager 依赖 `system.openDatabase()` 获取数据库。
3. `System.close()` 当前仅关闭数据库连接，不会主动调用 manager `close()`。

## 8. 当前实现已知问题（Review 关注项）

1. `connect.ts` 中 migration DDL 与 drizzle schema 存在字段漂移风险（详见 review findings）。
2. `hasNewMatchedResources` 的标题匹配使用分词 + 关键词命中，注释中已标记 hack。
3. `System.close()` 未级联 manager `close()`，initialize memo 生命周期与系统关闭不完全一致。
