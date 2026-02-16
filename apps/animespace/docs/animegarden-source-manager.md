# AnimeSpace v3 实现计划：SQLite 与 AnimeGardenSourceManager

## 1. 目标与范围

本计划聚焦于 `apps/animespace` 中 AnimeGarden 资源请求与本地缓存模块的落地实现，覆盖：

1. SQLite 连接与运行时迁移。
2. AnimeGarden 资源缓存表与关联关系建模。
3. `AnimeGardenSourceManager` 的查询、缓存命中、重拉策略。
4. 与 `System` 生命周期的集成。

不在本阶段实现：

1. RSS / magnet / torrent source 执行流程。
2. 自动缓存清理策略（后续讨论）。
3. SQLite 外键约束（本阶段不启用）。

## 2. 当前代码基线（已存在）

核心文件：

1. `apps/animespace/src/system/system.ts`
2. `apps/animespace/src/sqlite/connect.ts`
3. `apps/animespace/src/sqlite/metadata.ts`
4. `apps/animespace/src/sqlite/animegarden.ts`
5. `apps/animespace/src/sqlite/subject.ts`
6. `apps/animespace/src/sqlite/torrent.ts`
7. `apps/animespace/src/subject/animegarden.ts`

已确认状态：

1. `drizzle-orm` + `better-sqlite3` 已接入。
2. `System.openDatabase()` 已返回并缓存 `database`。
3. `migrateDatabase()` 仍是 TODO，尚未执行真实建表迁移。
4. `AnimeGardenSourceManager` 仍是空壳类。

## 3. 冻结决策（本计划执行依据）

1. ORM 与驱动：`drizzle-orm` + `better-sqlite3`。
2. 迁移方式：运行时 DDL 建表（不依赖 migration 文件执行）。
3. 缓存关系模型：使用 `filters + filterResources + resources`。
4. 暂不启用 SQLite 外键约束。
5. 暂不实现自动缓存清理策略。

## 4. 数据模型与约束

## 4.1 metadata

用途：

1. 保存 schema 版本与缓存游标信息（后续可扩展）。

当前键：

1. `schema_version`

需要补充：

1. `setMetadata`（upsert）工具方法。

## 4.2 animegarden_resources

用途：

1. 保存从 AnimeGarden 拉取到的标准化资源记录。

保留字段：

1. `id`（来源资源 id）
2. `provider`, `providerId`
3. `title`, `href`, `type`
4. `magnet`, `tracker`, `size`
5. `publisher`, `fansub`
6. `createdAt`, `fetchedAt`

约束：

1. 唯一索引 `(provider, providerId)`。
2. 索引 `createdAt`、`fetchedAt`。

## 4.3 animegarden_filters

用途：

1. 保存一个搜索条件的标准化快照与缓存命中主键。

字段：

1. `id`
2. `key`（过滤条件序列化键）
3. `filter`（JSON）
4. `createdAt`
5. `fetchedAt`

约束：

1. `key` 唯一。

## 4.4 animegarden_filter_resources

用途：

1. 维护某个 filter 命中的资源集合（关系表）。

字段：

1. `id`
2. `filterId`
3. `resourceId`

需要补充：

1. 唯一索引 `(filterId, resourceId)`，避免重复关系写入。

## 4.5 subjects / subject_files / torrents

`subjects`：

1. 作为配置快照表保留。
2. `source` / `naming` 先维持 JSON 占位（后续细化类型）。

`subject_files`（按当前阶段目标）：

1. 最小字段应覆盖：`subject + storage + path + size + mtime + status`。
2. 建议增加唯一约束 `(storage, path)`。

`torrents`：

1. `infoHash` 唯一（现状符合）。
2. `updatedAt` 需要修正列名为 `updated_at`（避免与 `created_at` 冲突）。

## 5. 运行时迁移设计（connect.ts TODO）

目标文件：`apps/animespace/src/sqlite/connect.ts`

`migrateDatabase(database)` 需要完成以下行为：

1. 启动事务。
2. 确保 `metadata` 表可用。
3. 读取 `schema_version`（默认 0）。
4. 按版本分支执行迁移（首版到 v1）：
   - 创建缺失表。
   - 创建缺失索引（含 `filterResources` 唯一索引）。
   - 修复已知列定义问题（如 `torrents.updated_at`）。
5. 写回 `schema_version = 1`。
6. 整体幂等：重复启动不破坏现有数据。

说明：

1. 当前不启用外键，因此迁移不包含 foreign key DDL。
2. 当前不做数据清理任务，因此迁移不包含 GC 逻辑。

## 6. AnimeGardenSourceManager 设计与实现

目标文件：`apps/animespace/src/subject/animegarden.ts`

## 6.1 对外接口

第一版建议最小接口：

1. `initialize(): Promise<void>`
2. `fetchResources(filter): Promise<FetchResourcesResult>`
3. `refresh(filter): Promise<FetchResourcesResult>`（强制重拉）
4. `close(): void`

## 6.2 filter key 规则

1. 对输入 filter 做标准化（数组去重、排序、时间归一化）。
2. 生成稳定字符串 key（querystring 或规范 JSON）。
3. 缓存命中只依赖该 key。

## 6.3 读写流程

`fetchResources(filter)`：

0. 调用 `initialize()` 初始化 manager, 拉取最近更新的资源列表
1. 生成 `filterKey`。
2. 查 `filters` 是否存在。
3. 若存在，查 `filterResources -> resources`。
4. 若命中, 且查询 fetched_at >= filter.fetched_at 的资源中是否有匹配的资源, 无需刷新时直接返回缓存结果。
5. 未命中或需刷新时调用远端 `@animegarden/client.fetchResources`。
6. upsert `resources`。
7. upsert `filters`（更新 `fetchedAt`）。
8. 重建该 `filterId` 对应的 `filterResources`（先删后插，或差量更新）。
9. 返回与 `fetchResources` 等价结构。

`refresh(filter)`：

1. 跳过命中判断，直接执行重拉与缓存覆盖。

## 6.4 错误策略

1. 远端请求失败：直接抛错，不回退旧缓存快照。
2. 本地数据库错误：直接抛错，交由上层命令处理。

## 7. System 集成计划

目标文件：`apps/animespace/src/system/system.ts`

1. `loadSpace()` 后可初始化 manager（懒加载或显式初始化二选一）。
2. `openDatabase()` 作为 manager 的唯一数据库入口。
3. `close()` 除关闭 SQLite client 外，调用 manager `close()`（若实现了内部资源）。

## 8. 分阶段实施步骤

### Step 1：修正表定义与约束

1. 修复 `torrents.updatedAt` 列名。
2. 为 `filterResources` 增加唯一索引。
3. 补齐 `subject_files.status` 与必要唯一索引。
4. 增加 `metadata.setMetadata`。

### Step 2：完成 connect.ts 迁移 TODO

1. 实现 `schema_version` 读取与写入。
2. 完成 v1 幂等迁移流程。
3. 迁移需要使用的 SQL 语句, 请使用命令 `pnpm -C apps/animespace drizzle:generate` 调用 drizzle-kit 相关指令生成 SQL。

### Step 3：实现 AnimeGardenSourceManager

1. 完成 `filterKey` 生成。
2. 完成缓存命中读取。
3. 完成远端重拉与缓存写入。
4. 完成 `refresh()`。

### Step 4：System 与 CLI 协作接入

1. 在实际命令路径中调用 manager（后续 import/watch 对接）。
2. 验证生命周期收敛（初始化、关闭）。
3. 接入 garden search CLI 命令

## 9. 测试与验收预期

## 9.1 SQLite 迁移测试

1. 空库启动后能自动建表与建索引。
2. 重复启动幂等，不重复报错。
3. `schema_version` 正确写入。

## 9.2 表约束测试

1. `resources(provider, providerId)` 唯一生效。
2. `filterResources(filterId, resourceId)` 唯一生效。
3. `torrents.updatedAt` 写入落在正确列。

## 9.3 Manager 行为测试

1. 首次请求走远端并写缓存。
2. 相同 filter 二次请求命中缓存。
3. `refresh(filter)` 强制重拉并覆盖缓存。
4. 远端失败时抛错。

## 9.4 集成测试

1. `System.openDatabase()` 后 manager 可用。
2. `System.close()` 后数据库连接释放。

## 10. 风险与后续议题

1. 当前不启用外键，关系一致性需靠应用层保证。
2. 缓存长期增长尚无自动清理机制（已明确后续讨论）。
3. `source` 未来扩展到 feed/magnet/torrent 时，建议抽象统一 SourceManager 接口。
