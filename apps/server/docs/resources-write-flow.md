# Resources 插入与更新链路梳理

日期：2026-04-09

## 背景

`apps/server` 当前在线上实际承载了三类服务角色：

1. `fly.server.toml` 中的 `server` 进程
2. `fly.server.toml` 中的 `cron` 进程
3. `fly.feed.toml` 中的 `server` 进程

从代码实现看，这三类进程都基于同一套 `apps/server` 代码启动，也都能连接同一个 Postgres 和 Redis；但它们在部署职责上并不相同。

本文聚焦说明：

1. 哪个服务负责主资源写入
2. `resources` 的插入、更新、删标、详情回填分别经过哪些代码路径
3. 三类服务之间如何通过数据库和 Redis 传递数据
4. 哪些路径属于预期主链路，哪些只是代码层面的例外写路径

## 服务角色

### 1. Web 服务

对应 `fly.server.toml` 里的 `server = './apps/server/manager.sh start'`。

职责上，它主要服务 web 前端调用，包括：

- `/resources`
- `/resource/:provider/:id`
- `/detail/:provider/:id`
- `/subjects`
- `/collections`
- `/feed.xml`

启动入口是 `cli start`，会以 `cron: false`、`profile: 'server'` 创建普通服务实例。

### 2. Cron 服务

对应 `fly.server.toml` 里的 `cron = 'node apps/server/cli.mjs cron'`。

职责上，它是资源抓取、插入、更新、删标的主执行者。

启动入口是 `cli cron`，会以 `cron: true`、`profile: 'cron'` 创建执行器，并注册定时任务：

- 每 5 分钟执行一次 `/admin/resources/:provider`
- 每小时执行一次 `/admin/resources/:provider/sync`

### 3. Feed / OpenAPI 服务

对应 `fly.feed.toml` 中唯一的 `server = './apps/server/manager.sh start'`。

职责上，它主要对 RSS 和 OpenAPI / API 调用提供只读访问能力。部署预期是读服务，但代码上它和 web 服务使用同一套 `start` 入口，因此并不是严格的只读进程。

## 总体数据流

可以把主链路概括为：

1. `cron` 进程定时抓取上游 provider 数据
2. `cron` 进程在本进程内复用 Hono 路由，进入 `/admin/resources/*` 写路径
3. `cron` 进程写入 Postgres 中的 `users`、`teams`、`resources`
4. `cron` 进程把变更摘要发布到 Redis `NOTIFY_CHANNEL`
5. web `server` 和 feed `server` 订阅该通知，刷新本进程内的 resources 查询缓存
6. 前端、RSS、OpenAPI 请求再从各自服务读取同一份 Postgres 数据

这里有一个容易误解的点：

- `cron` 不是通过外部网络去调用另一个服务
- 它是在自己进程内通过 `this.hono.fetch(req)` 复用同一套路由和 handler

因此主写链路实际上完全发生在 `cron` 进程内部，只是写完以后会通过 Redis 把变更广播给其他读服务。

## 主写链路一：增量插入

### 触发位置

`cron` 进程启动后会注册 `*/5 * * * *` 定时任务，按 provider 调用：

- `/admin/resources/dmhy`
- `/admin/resources/moe`
- `/admin/resources/ani`

### 执行流程

1. 路由进入 `server/routes/admin.ts` 的 `fetchResources(sys, platform)`。
2. 根据 provider 取出 `ScraperProviders.get(platform)`。
3. 调用 `provider.fetchLatestResources(sys)` 抓最新资源。
4. `dmhy` / `moe` 会翻页抓取，直到某一页已经没有新的 `providerId`。
5. `ani` 直接抓最新列表，再过滤 DB 中已经存在的 `providerId`。
6. 抓到的资源先转换出发布者和字幕组信息，分别写入 `users`、`teams`。
7. 再把资源转换成 `NewResource`，统一传给 `sys.modules.resources.insertResources(...)`。
8. `insertResources()` 会：
   - 先按 `provider:providerId` 去重
   - 做标题标准化、大小转换、分词和 subject 匹配
   - 生成 `titleSearch`
   - 计算 `duplicatedId`
   - 执行 `insert into resources ... onConflictDoNothing()`
9. 如果开启 `updateDuplicatedId`，插入后还会把后续重复资源的 `duplicatedId` 更新到当前根资源。
10. 插入成功后，`cron` 更新 provider refresh timestamp，并调用 `notifyRefreshedResources(...)`。

### 写入结果

这条链路会写：

- `users`
- `teams`
- `resources`

如果存在重复关系，还会更新其他资源的 `duplicated_id`。

## 主写链路二：同步更新与删标

### 触发位置

`cron` 进程启动后会注册 `0 * * * *` 定时任务，按 provider 调用：

- `/admin/resources/dmhy/sync`
- `/admin/resources/moe/sync`
- `/admin/resources/ani/sync`

### 执行流程

1. 路由进入 `server/routes/admin.ts` 的 `syncResources(sys, platform, start, end)`。
2. 调用 `provider.fetchResourcePages(sys, start, end)` 抓指定页区间。
3. 把抓到的数据逐条传给 `sys.modules.resources.updateResource(r, updatedAt)`。
4. `updateResource()` 会先重新执行和插入时相同的 transform。
5. 如果 `(provider, providerId)` 在数据库中不存在，则回退到 `insertResources()`，也就是“更新链路中的新资源补插入”。
6. 如果数据库中已存在，则逐字段比较并更新：
   - `isDeleted`
   - `href`
   - `magnet`
   - `tracker`
   - `subjectId`
   - `publisherId`
   - `fansubId`
   - `title`
   - `titleAlt`
   - `titleSearch`
7. 同时强制重算当前资源的 `duplicatedId`。
8. 然后清空指向当前资源的旧重复链，再把更晚的同标题 / 同 magnet 资源重新挂到当前资源下。
9. 所有资源更新完成后，路由层汇总 `updated / inserted / duplicated`，并发送一次 resources 更新通知。

### 删标流程

更新结束后，同一个 `/sync` 请求还会继续执行删标：

1. 调用 `sys.modules.resources.syncResources(platform, newResources)`。
2. 以本次抓到的最小和最大 `createdAt` 为边界，在数据库中找出：
   - provider 相同
   - 仍然 `isDeleted = false`
   - 落在同一时间窗口内
   - 但本次抓取结果中不存在的资源
3. 把这些资源统一标记为 `isDeleted = true`。
4. 把所有指向这些已删资源的 `duplicatedId` 清空。
5. 再发送一次“删除资源”通知。

### 写入结果

这条链路会写：

- `resources`

具体包括：

- 插入缺失资源
- 更新已存在资源字段
- 更新去重链
- 逻辑删除缺失资源

## 服务间同步链路

`cron` 写库后，并不会直接刷新其他进程里的内存缓存，而是通过 Redis 通知实现进程间同步。

### 1. `cron` 负责发布

当 `System.options.cron === true` 时，`notifyRefreshedResources()` 会：

1. 组织一份通知结构
2. 将其发布到 Redis `NOTIFY_CHANNEL`

通知内容包括：

- `resources.inserted`
- `resources.deleted`
- `duplicated.inserted`
- `duplicated.duplicated`

### 2. `server` 负责订阅

当 `System.options.cron === false` 时，普通 `server` 进程会订阅：

- `NOTIFY_CHANNEL`
- RPC reply channel

收到 `NOTIFY_CHANNEL` 后，会调用 `refresh(notification)`。

### 3. Resources 查询缓存刷新

`ResourcesModule.refresh(notification)` 会进一步进入 `QueryManager.onNotifications(notification)`，执行：

1. 清空 Redis 查询缓存和精确查询缓存
2. 根据通知里的 `deleted` / `duplicated` 移除任务缓存中的旧资源
3. 根据通知里的 `inserted` / `duplicated.inserted` 重新从数据库加载最新 live root 资源
4. 把这些资源塞回现有 task 缓存

因此服务间真实的流转关系是：

- Postgres 负责共享持久化数据
- Redis 负责广播资源变更事件
- 各个 `server` 进程负责消费变更并修正本地内存状态

## 详情链路中的例外写入

除了 `cron` 主写链路外，还有一条“读请求触发写入”的例外路径。

### 触发位置

任一 `server` 进程收到以下请求时：

- `/resource/:provider/:id`
- `/detail/:provider/:id`
- `/detail/infohash/:hash`

都会进入 `Resources.details.getByProviderId()` 或 `getByInfoHash()`。

### 执行流程

1. 先查 Redis detail cache。
2. Redis 未命中则查 `resources`。
3. 再查 `details` 表。
4. 如果 detail 不存在、已过期，或者资源本身已删除，则回源抓 detail。
5. `insertDetail()` 会把抓到的 detail 写入 `details` 表，并回填 Redis。
6. `fixResourceWithDetail()` 还会顺手做几类修复：
   - 缺失 magnet / tracker 时，直接更新 `resources`
   - 发布者头像缺失时，补写 `users`
   - 字幕组头像缺失时，补写 `teams`
   - 最后再调用一次 `resources.updateResource(...)`，把资源信息重新标准化并重算去重关系

### 影响

这说明：

- web 服务可以在 detail 请求中写 `details`
- web 服务也可能顺手修补 `resources`
- feed 服务由于同样跑 `cli start`，理论上也具备同样能力

但这条路径不是资源主同步链路，只是 detail 请求触发的数据修正链路。

## 三类服务的职责边界

按当前部署约定，可以把职责理解为：

### 1. `fly.server.toml` 的 `server`

主要职责：

- 服务 web 前端读请求
- 订阅 Redis 变更并刷新缓存
- 在 detail 请求中执行少量修补写入

不承担的主职责：

- 定时抓取资源
- 定时插入 / 更新 / 删标 `resources`

### 2. `fly.server.toml` 的 `cron`

主要职责：

- 定时抓取 provider 数据
- 插入新资源
- 更新已有资源
- 逻辑删除缺失资源
- 维护 duplicated 关系
- 发布 Redis 变更通知

这是 `resources` 主写路径的唯一预期执行者。

### 3. `fly.feed.toml` 的 `server`

主要职责：

- 对 RSS、OpenAPI / API 提供读访问
- 订阅 Redis 变更并刷新缓存

部署预期上它不承担主写职责，但代码上仍保留：

- `/admin/*` 路由
- detail 回填写路径

因此它是“部署上偏只读、代码上非严格只读”的服务。

## 需要特别注意的点

### 1. `/admin/*` 路由并不只存在于 `cron`

`registerHono()` 会把 `defineAdminRoutes(sys, app)` 同时绑定到 `makeServer()` 和 `makeExecutor()` 上。

这意味着：

- web 服务有 `/admin/*`
- feed 服务也有 `/admin/*`
- cron 服务同样也有 `/admin/*`

只是按部署职责，只有 `cron` 会自动定时调用这些路由。

### 2. `cron` 写路径依赖同一套应用代码，而不是单独 worker

当前主写链路不是“独立 worker 直接调模块写库”，而是：

1. `Executor` 注册 cron job
2. cron job 在本进程构造内部 Request
3. Hono 路由复用 `admin.ts`
4. `admin.ts` 再调用 `ResourcesModule`

因此分析写路径时，应把 `admin.ts` 看成主写入口，而不是把它当成纯 HTTP API 外壳。

### 3. `/sync` 链路没有先补 `users/teams`

增量插入链路在落 `resources` 之前会先插 `users`、`teams`。

但 `/sync` 路径里的 `updateResource()` 直接依赖 transform 解析 `publisherId` / `fansubId`。这意味着：

- 它隐含要求对应的发布者和字幕组已经在本地存在
- 否则 transform 失败后，该条资源会被跳过

这属于当前实现上的前置假设。

## 总结

如果只看部署职责，`resources` 的插入、更新、删标主链路都在 `fly.server.toml` 的 `cron` 进程中执行。

服务间的数据流转关系是：

1. `cron` 抓取上游并写 Postgres
2. `cron` 通过 Redis 发布资源变更通知
3. web `server` 和 feed `server` 订阅通知并刷新本地缓存
4. 前端、RSS、OpenAPI 再从各自服务读取共享数据库中的最新数据

如果把代码能力也算上，则还要补一句：

- web 服务和 feed 服务并非绝对只读
- 它们在 detail 回填和手动调用 `/admin/*` 时，仍然可能写 `details`、`users`、`teams`、`resources`

但这些都不是线上预期的主资源同步职责。
