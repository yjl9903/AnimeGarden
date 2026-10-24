# 动态番剧资料与缓存

## 数据来源和持久化

Web、TG 和 RSS 的番剧资料统一来自 `bgmx` 的 `bgm.animes.garden` 服务，经
`packages/shared/src/bgmx.ts` 转换。服务运行时不再依赖 `bgmd`；该包仅保留为 anipar
离线标题提取脚本的开发依赖。

cron 的 `updateCalendar()` 拉取完整 subjects 列表，用 `calendar + web` 决定活跃范围。
`subjects.metadata` 保存标题、展示名、别名、平台、开播日期、封面、简介、标签和 search；
`subjects.search` 用于资源绑定。展示资料变化也会更新数据库，但仅新增活跃条目或 search
变化触发历史绑定；绑定仍只补 `subject_id IS NULL`，详见 [推送触发链路](./telegram-push-flow.md#2-bgmx-subject-绑定补偿触发)。

换季只改变归档状态，不删除历史资料；全量列表未再返回的本地记录也保留。
全量扫描或 calendar 请求失败时，本轮不写库。同步成功后按以下顺序执行：
事务提交 → 重载本进程快照 → 绑定历史资源 → 新绑定资源入队 → 广播 subject 变更通知。

## 读取与刷新

| 使用方 | 读取与刷新 | 故障行为 |
| --- | --- | --- |
| TG / RSS | `getSubjectMetadata(id)` 直接读数据库，包含归档条目；metadata 缺失时动态查询单条资料，不回写数据库 | 数据库及上游异常向上传播；单条接口明确返回 404 时视为缺失 |
| 资源绑定、`/subjects`、sitemap | 启动时加载数据库快照，收到 `subjects: true` 通知时刷新；每 10 分钟轮询兜底 | 重载失败保留旧快照，后续轮询重试；漏通知延迟约为一个周期加查询时间 |
| Web 详情、搜索、季度表及目录 | 直接查询同一动态服务；进程 LRU 缓存最多 1024 项，有效期 1 小时 | 临时故障使用最近成功响应，60 秒后重试；无旧数据则抛错，明确的 404 不回退旧数据；重启或淘汰后缓存丢失 |

数据库快照重载串行执行，避免旧查询覆盖新结果。正常更新依靠通知，轮询用于补偿 Redis 离线或漏通知。

有封面资料时统一输出 `https://bgm.animes.garden/bangumi/subject/{id}/poster.jpeg?quality=large`。
统一地址不保证 Telegram 抓图成功；`sendPhoto 400 failed to get HTTP URL content` 仍需检查镜像响应和 Telegram 抓取结果。

## 数据库与同步

`0010_subject_metadata.sql` 为 `subjects` 添加可空 JSON 字段 `metadata`，当前代码依赖该字段，
无需新增环境变量。数据库迁移只添加字段，资料由 cron 启动导入或每小时 `:17` 的 calendar
同步填充；metadata 缺失时的单条查询兜底仍依赖上游可用性。

不要用 `import subjects` 代替 calendar 同步：该维护命令会先清空资源绑定再全量重导。
回滚旧应用时保留新增字段和已填充资料。

## 漏推补偿

`prepare()` 在写状态前退出的资源没有 `telegram_messages` 记录，普通失败补偿不会覆盖。
动态单条资料查询暂时失败也可能进入这一盲区；后续同步不会自动重推已绑定资源。

按 subject、时间范围、类型、字幕组和既有消息筛选候选资源，再使用
`pnpm manager telegram push --resource <provider>:<providerId>` 补推。
`--subject <id>` 会遍历该条目全部未删除资源，限定时间范围时应使用显式资源清单。
默认不加 `--force`，沿用已有发布者、subject、episode 去重及优先级规则；跨站资源数不等于频道消息数。
小批量确认状态和频道结果后再扩大范围；进入持久化状态后的失败沿用 [失败补偿流程](./telegram-push-flow.md#失败补偿)。
