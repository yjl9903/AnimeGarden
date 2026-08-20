# 用户与字幕组名称归一化

资源写入前，`UsersModule` 和 `TeamsModule` 统一处理所有 provider 的发布者与字幕组名称。

- 只删除首尾空白、零宽字符，并应用 `src/users/normalize.ts` 中有真实数据依据的固定修正；不替换内部空格，也不做通用繁简转换或后缀删除。
- 优先按 `(provider, providerId)` 查找，其次按主名称及 `providers[provider].aliases` 查找。
- `ProviderInfo.aliases` 只保存旧名称字符串；不增加数据库字段。
- 同一实体出现新名称时，仅当携带该名称的资源不早于库内关联资源的最大 `created_at`，才更新主名称；其他名称记录为 alias。
- 只有 cron 服务会在启动或刷新后于后台按实体 ID 分批加载最大 `created_at`；用户/字幕组插入会主动确保该任务已经启动并等待完成。
- Mikan 联合发布优先读取发布组页的当前名称；无法取得时，除已确认的单组名称外，将全角 `＆` 转为 `&` 并取第一个组，再进入统一名称归一化。

存量数据使用 [`apps/server/scripts/normalize-party-data.sql`](../../apps/server/scripts/normalize-party-data.sql)
一次性处理。SQL 在事务中验证已审核名称、合并重复 providerId 和明确别名组、迁移
`resources` / `telegram_messages` 引用并检查结果；验证失败时整笔事务回滚。
