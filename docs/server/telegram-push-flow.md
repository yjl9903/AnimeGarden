# Telegram 资源推送链路

日期：2026-05-08

## 背景

Telegram 推送模块负责把新增资源转换成频道消息，并在后续出现更高优先级资源时编辑已发送消息。

这条链路的目标不是“每条资源都发一条消息”，而是：

1. 只推送明确可解析、可归档到 subject 和 episode 的动画资源。
2. 对同一发布者、同一条目、同一集数只保留一条 Telegram 消息。
3. 后续出现更高优先级资源时复用原消息进行编辑。
4. 抓取任务不被 Telegram 网络请求阻塞。
5. Telegram API 调用串行执行，降低限流和乱序风险。
6. 已选择但未完成的推送状态要持久化，服务重启后可以补偿。

## 相关模块

主要代码位于 `apps/server/src/push`：

- `module.ts`：`PushModule`，负责入队、失败补偿、状态持久化和 Telegram API 封装。
- `push.ts`：`PushContext`，负责单条资源的解析、去重、优先级判断和发送 / 编辑决策。
- `message.ts`：Telegram photo caption 构造。
- `guard.ts`：资源类型和字幕组白名单过滤。
- `index.ts`：模块导出。

相关持久化结构：

- `apps/server/src/schema/telegram.ts`
- `apps/server/drizzle/0006_tranquil_purple_man.sql`

资源触发入口：

- `apps/server/src/resources/jobs.ts`
- `apps/server/src/subjects/bgmd.ts`
- `apps/server/src/subjects/index.ts`

## 数据模型

`telegram_messages` 表用于记录“某个去重键当前对应哪条 Telegram 消息，以及推送状态”。

当前字段语义：

- `id`：自增主键。
- `resource_id`：当前被选择用于推送的资源 id。
- `publisher_id`：发布者 id，是当前去重键的一部分。
- `fansub_id`：字幕组 id，可空，仅作为预留和展示辅助，不参与当前去重逻辑。
- `subject_id`：Bangumi subject id，是当前去重键的一部分。
- `episode`：归一化 episode key，是当前去重键的一部分。
- `telegram_chat_id`：Telegram chat id，发送成功后持久化。
- `telegram_message_id`：Telegram message id，发送成功后持久化。
- `status`：smallint 状态。
- `sent_at`：首次发送成功时间。
- `edited_at`：最近一次编辑成功时间。
- `updated_at`：状态更新时间。

唯一索引是：

```sql
publisher_id, subject_id, episode
```

`fansub_id` 不参与唯一索引。这样做是因为当前业务期望按发布者维度归并消息；字幕组信息可能缺失，也可能后续只用于展示名称、标签或其他派生逻辑。需要显示字幕组名称时，使用：

```ts
resource.fansub?.name ?? resource.publisher.name
```

## 状态机

当前状态值定义在 `TelegramMessageStatus`：

| 状态 | 数值 | 含义 |
| --- | ---: | --- |
| `Pending` | `0` | 前置逻辑已经选中资源并写入表，正在等待 Telegram API 队列执行 |
| `Sending` | `1` | 已进入 Telegram API 调用前一刻，正在发送或编辑 |
| `Sent` | `2` | Telegram 发送或编辑成功 |
| `Failed` | `-1` | Telegram 发送或编辑失败，等待后续补偿 |

状态流转大致为：

```text
无记录 / Failed / 可编辑的 Sent
  -> Pending
  -> Sending
  -> Sent

Pending / Sending 超过 6h
  -> Failed
  -> 重新 enqueue

Telegram API 抛错
  -> Failed
```

`Pending` 和 `Sending` 的区分很重要：

- `Pending` 表示数据库前置决策已经完成，但还在等待串行 Telegram 队列。
- `Sending` 表示队列已经轮到它，Telegram API 调用即将开始或正在进行。

因此，`Pending` 不应被误认为 Telegram 请求卡住；只有超过 6 小时的 `Pending/Sending` 才会被补偿逻辑转为 `Failed`。

## 触发链路

当前有两类入口会触发 Telegram 推送：

1. `runFetchJob` 插入新资源后触发。
2. cron 初始化 / 手动更新 bgmd calendar 时，新 subject 补偿绑定到历史资源后触发。

`runSyncJob` 不触发 Telegram 推送。

### 1. runFetchJob 新资源触发

`runFetchJob` 的关键顺序是：

1. 抓取 provider 最新资源。
2. `upsertResources` 写入新增 / 更新资源。
3. `maintainDuplicatedResources` 维护重复链路。
4. 有变更时发送资源更新通知。
5. 通知完成后异步执行：
   - 把本次 `upsert.inserted` 的 resource ids 传给 `enqueueResourceMessages`。
   - 调用 `enqueueFailedResourceMessages` 做失败补偿。

推送入口使用 `void` 调用，不 `await`。这保证抓取任务不会等待 Telegram 网络请求，也不会因为 Telegram 失败影响资源写入主链路。

### 2. bgmd subject 绑定补偿触发

cron 服务启动时，如果没有关闭 `--import`，会在初始化完成后执行：

```text
cli cron
  -> sys.import()
  -> SubjectsModule.import()
  -> SubjectsModule.updateCalendar()
  -> updateCalendar(mod)
```

`updateCalendar()` 会读取 `bgmd/calendar`，对当前季度 subject 做增量更新：

1. 对比 bgmd calendar 和本地 active subjects。
2. 归档不再活跃的 subject。
3. 插入 / 更新当前 calendar 中的 subjects。
4. 对这些 subject 执行 `indexResources: true`，把历史 resources 中尚未绑定 subject 的记录补上 `subject_id`。
5. 因为这里开启了 `pushTelegramMessage: true`，`insertSubjects()` 会收集每个 `indexSubject()` 返回的 matched resources。
6. 将这些新绑定 subject 的 resource ids 去重后传给 `enqueueResourceMessages`。

这条链路用于补偿一个常见时间差：

- 资源先被抓到，但当时本地还没有对应 subject，因此 `subject_id` 为空，不能推送。
- 之后 cron 初始化或 calendar 更新引入了新 subject。
- `indexSubject()` 将这些历史资源补上 `subject_id`。
- 补上 subject 后，这些资源已经具备 `PushContext.prepare()` 所需的 subject 条件，因此需要触发 Telegram 推送。

这条触发链路只处理“本次 subject 索引新绑定到 subject 的资源”。它不直接扫描所有历史资源，也不负责补偿 Telegram `Failed/Pending/Sending` 状态；状态补偿仍由 `enqueueFailedResourceMessages()` 处理。

## 入队与并发模型

`PushModule` 内部有两个并发边界：

### 1. resource 维度的内存去重

`pendingResourceIds` 是单进程内的 `Set<number>`。

它只保证同一个 resource id 在上一次 `pushResourceMessage` 结束前不会重复进入推送前置逻辑。它不是跨进程锁，也不负责按 episode 去重；真正的业务去重依赖数据库唯一索引和查询。

### 2. Telegram API 串行队列

`newQueue(1)` 只包住 Telegram 关键写接口：

- `sendResourceMessage`
- `editResourceMessage`

也就是说，下面这些步骤允许并发执行：

- 加载 resource。
- type / fansub guard。
- anipar 解析。
- subject 查找。
- 查 `telegram_messages`。
- 比较新旧资源优先级。
- 写入 `Pending`。
- 构造消息体。

只有真正调用 Telegram API 前才进入串行队列，并在队列内先把状态改为 `Sending`。

状态写入使用 `resource_id` 做乐观锁。抢占、进入 `Sending`、写入 `Sent/Failed` 都要求数据库当前 `resource_id` 仍等于本任务期望值；如果锁已被更高优先级资源接管，旧任务会停止后续写入。

这个设计的原因是：数据库前置逻辑本身不应被 Telegram 网络速度拖慢，但 Telegram 频道写操作需要保守串行，避免限流或消息顺序异常。

## 资源过滤与解析

`PushContext.prepare()` 会在写 `telegram_messages` 前做过滤和解析。

当前过滤条件：

1. 只允许 `type === '动画'` 的资源。
2. 字幕组 / 发布者名称必须通过白名单。
3. 必须能找到 `subjectId` 对应的 subject。
4. 标题必须能被 `anipar` 解析。
5. 必须能解析出 episode。

白名单判断使用：

```ts
resource.fansub?.name ?? resource.publisher.name
```

这使得无 `fansub` 的 ANi 等资源仍可以用 publisher 名称走白名单和解析。

解析失败、subject 缺失、episode 缺失、白名单不通过时，不写 `telegram_messages`。这样可以避免表里堆积不可执行的记录。

## Episode 归一化

`episode` 字段既是持久化字段，也是去重键的一部分。

当前归一化格式：

- 单集：`episode:{ep}`
- 范围：`episodes_range:{ep1}-{ep2}`
- 多集：`episodes:{ep1}-{ep2}-...`

小数集数会保留小数形式，例如：

```text
episode:12.5
```

这里刻意用字符串而不是复杂结构，是为了让数据库唯一索引和查询条件简单稳定。

## 单条资源推送决策

`pushResourceMessage(id)` 会创建 `PushContext`，并执行：

1. `prepare()`：过滤资源、解析标题、生成 subject 和 episode。
2. `run()`：查询历史消息并做状态分支。
3. `push()`：写状态、构造消息并调用发送 / 编辑。

历史消息按：

```text
publisherId + subjectId + episode
```

查询。

### 无历史消息

创建一条 `Pending` 记录，保存：

- `resource_id`
- `publisher_id`
- `fansub_id`
- `subject_id`
- `episode`
- `updated_at`

随后构造消息，进入 Telegram 发送队列。

发送成功后更新：

- `status = Sent`
- `telegram_chat_id`
- `telegram_message_id`
- `sent_at`
- `updated_at`

发送失败后更新：

- `status = Failed`
- `updated_at`

### 历史为 Pending 或 Sending

会加载旧 `resource_id` 对应资源，并和当前资源比较优先级。

- 当前资源优先级不更高：跳过。
- 当前资源优先级更高：用 `resource_id` 乐观锁更新记录为 `Pending`，随后继续发送或编辑。

如果旧任务已经进入 Telegram API 请求，后续写 `Sent/Failed` 时仍会带旧 `resource_id` 条件。写入失败表示记录已被新资源接管：旧任务不会覆盖新 owner；如果旧任务刚发送出一条新的低优先级消息，会尝试删除这条陈旧消息。

### 历史为 Failed

会加载旧 `resource_id` 对应资源，并和当前资源比较优先级。

- 如果旧资源优先级更高，本轮继续用旧资源重试。
- 否则当前资源接管这条记录。

无论使用旧资源还是当前资源，都会把记录更新为 `Pending`，随后按首次发送流程发送一条新的 Telegram 消息。

### 历史为 Sent

会加载旧 `resource_id` 对应资源，并和当前资源比较优先级。

- 当前资源优先级不更高：跳过。
- 当前资源优先级更高：更新记录为 `Pending`，并编辑原 Telegram 消息。

如果历史记录缺少 `telegram_chat_id` 或 `telegram_message_id`，当前实现会记录 warn，并退化为发送新消息。

编辑成功后更新：

- `status = Sent`
- `edited_at`
- `updated_at`

编辑失败后更新：

- `status = Failed`
- `updated_at`

当前编辑只使用 `editMessageCaption`，不再 fallback 到 `editMessageText`。

## 优先级规则

资源优先级按以下顺序比较，越大越优先：

1. `version`：数字越大越优先，缺省为 `0`。
2. 字幕语言：
   - 包含简中最高。
   - 包含繁中其次。
   - 没有简繁最低。
3. provider 优先级：沿用 `SupportProviders` 顺序，当前业务上是 `dmhy > moe > mikan > ani`。
4. `created_at`：更新时间更新的资源优先。

这套规则用于两类场景：

- `Failed` 重试时决定旧资源还是当前资源负责重试。
- `Sent` 已发送时决定是否编辑原消息。

## 失败补偿

`enqueueFailedResourceMessages()` 在每次 `runFetchJob` 通知完成后异步执行。

它会做两件事：

1. 查询最近 7 天内 `status = Failed` 的 distinct `resource_id`。
2. 把超过 6 小时的 `Pending` 和 `Sending` 更新成 `Failed`，并返回这些 `resource_id`。

然后将两批 id 合并去重后重新交给 `enqueueResourceMessages`。

这个补偿策略覆盖：

- Telegram API 请求失败。
- 进程在 `Pending` 后、真正调用 Telegram 前退出。
- 进程在 `Sending` 后、写入 `Sent` 前退出。
- Telegram 请求长时间卡住。

补偿窗口做了两个限制：

- `Failed` 只补偿最近 7 天，避免永久重试历史坏数据。
- `Pending/Sending` 必须超过 6 小时才视为陈旧，避免误伤正常排队任务。

## Telegram 消息内容

当前发送的是 photo message，正文写入 caption。

caption 包含：

- subject hashtag 和季度 hashtag。
- subject 标题和 episode。
- 字幕组 / 协作字幕组 hashtag。
- 字幕语言和字幕格式。
- 视频格式。
- 资源大小。
- 发布时间。
- 追踪 hashtag。
- 详情页链接和在线播放链接。

消息体不持久化。`telegram_messages` 只保存执行状态和 Telegram 定位信息，不保存 `telegram_message_content` 或请求参数。

字幕组 hashtag 会做归一化，例如：

- `FLsnow` / `雪飘工作室FLsnow` 归一到 `雪飘工作室`。
- `Nekomoe kissaten` / `喵萌奶茶屋` 归一到 `喵萌奶茶屋`。

caption 使用 Telegram HTML parse mode，因此业务文本需要 HTML escape。

## 当前刻意不做的事

### 不在 runSyncJob 触发推送

同步任务主要用于修正历史资源、删标和补洞。当前推送只由增量 fetch 的 inserted 资源，以及 bgmd calendar 更新时新绑定 subject 的 resources 触发，避免 sync 扫描历史数据时产生大量非预期推送。

### 不持久化消息体和请求参数

消息体可以由 resource、subject 和 parsed result 重新生成。当前只需要持久化状态和 Telegram message id，不额外存储 caption 或 send request。

### 不做强数据库锁

当前没有使用事务锁、advisory lock 或外部队列锁。并发控制依赖单进程内 `pendingResourceIds`、数据库唯一索引、Telegram API 串行队列，以及基于 `resource_id` 的乐观锁，避免旧 worker 覆盖新 owner 的状态。

如果未来出现多个高并发 cron 实例同时推送，仍需要评估是否引入更强的跨进程队列或锁。

### 不做 editMessageText fallback

消息发送和编辑统一围绕 photo caption。编辑失败后记录 `Failed`，由补偿链路重试，不再尝试降级为 text message。

## 测试关注点

当前测试应重点覆盖：

- episode 归一化：单集、小数集、范围、多集。
- guard：非动画跳过、字幕组白名单跳过、无 fansub 时使用 publisher 名称。
- 首次发送：无历史记录时创建 `Pending`，进入 Telegram 队列后变 `Sending`，成功后变 `Sent`。
- 失败：Telegram API 抛错后变 `Failed`。
- `Pending/Sending`：低优先级跳过，高优先级用 `resource_id` 乐观锁抢占；旧 worker 失锁后不再写状态，必要时删除陈旧新消息。
- `Failed`：旧资源和当前资源按优先级比较后重试。
- `Sent`：低优先级跳过，高优先级编辑。
- 队列：resource 前置逻辑并发执行，Telegram API 调用串行执行。
- 补偿：最近 `Failed`、超时 `Pending/Sending` 都会重新 enqueue。
- bgmd subject 绑定：`insertSubjects(..., { indexResources: true, pushTelegramMessage: true })` 会把本次 `indexSubject()` 新绑定的 resource ids 去重后 enqueue；关闭 `pushTelegramMessage` 时不触发。

## 后续风险与扩展点

### 多实例并发

当前设计主要面向单 cron 推送实例。若后续部署多个会执行推送的进程，`pendingResourceIds` 只能做本进程去重，不能防止跨进程同时处理同一去重键。

可选演进方向：

- 在数据库更新时增加条件状态检查。
- 引入 advisory lock。
- 用外部队列替代本地内存队列。

### Telegram 限流策略

当前只用 `newQueue(1)` 保守串行，没有实现按 Telegram 返回的 retry-after 做退避。如果后续频道规模扩大，可以在 `sendPhoto` / `editMessageCaption` 外层增加限流错误识别和延迟重试。

### 消息格式演进

当前没有持久化消息体，因此消息格式变化后，后续编辑会使用新格式覆盖旧 caption。这通常是可接受的，但如果未来需要审计历史发送内容，就需要新增内容快照字段。
