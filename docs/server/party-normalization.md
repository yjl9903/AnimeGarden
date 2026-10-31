# 用户与字幕组名称归一化

资源写入前，`UsersModule` 和 `TeamsModule` 统一处理所有 provider 的发布者与字幕组名称。

- 只删除首尾空白、零宽字符，并应用 `src/users/normalize.ts` 中有真实数据依据的固定修正；不替换内部空格，也不做通用繁简转换或后缀删除。
- 优先按 `(provider, providerId)` 查找，其次按主名称及 `providers[provider].aliases` 查找。
- `ProviderInfo.aliases` 只保存旧名称字符串；不增加数据库字段。
- 同一实体出现新名称时，仅当携带该名称的资源不早于库内关联的有效资源（`is_deleted = false AND duplicated_id IS NULL`）的最新 `created_at`，才更新主名称；其他名称记录为 alias。已删除或标记重复的历史资源不再参与数据库时间基准的计算。
- 用户/字幕组写入只按需加载本次涉及的已有实体时间，不再在 server 或 cron 启动、刷新时全量预热；空输入直接返回，新实体无需查询历史时间。
- 查询按最多 500 个实体分批，每个实体通过相关子查询 `ORDER BY created_at DESC LIMIT 1` 取最新有效资源，复用现有 `resources_live_publisher_created_at_index` / `resources_live_fansub_created_at_index`；字幕组查询同时包含 `fansub_id IS NOT NULL`，无需新增索引或数据库迁移。
- 时间基准（包括没有有效资源的结果）在进程内缓存，同一实体的并发加载共享任务，失败后可重试。当前进程收到的资源时间仍单调推进该基准，以防较旧输入覆盖较新名称；模块刷新时清空缓存，下次写入重新读取有效资源时间，刷新前的未完成查询不会写回旧结果。
- Mikan 联合发布优先读取发布组页的当前名称；无法取得时，除已确认的单组名称外，将全角 `＆` 转为 `&` 并取第一个组，再进入统一名称归一化。

Web 导航的 `apps/web/src/utils/constants.ts` 字幕组列表和番剧详情页
`apps/web/src/pages/subject.$subject.($page)/utils.ts` 的预设排序使用归一化后的主名称。
新增名称修正时需同步检查这两处，避免导航继续使用旧名称或详情页无法匹配预设排序。

存量数据使用 [`apps/server/scripts/normalize-party-data.sql`](../../apps/server/scripts/normalize-party-data.sql)
一次性处理。SQL 在事务中验证已审核名称、合并重复 providerId 和明确别名组、迁移
`resources` / `telegram_messages` 引用并检查结果；验证失败时整笔事务回滚。
