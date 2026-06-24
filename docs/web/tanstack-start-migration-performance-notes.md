# TanStack Start 迁移性能优化草案

状态：尚未实现, 临时草案，供后续方案讨论使用。

## 背景

`apps/web` 计划从 Remix 迁移到 TanStack Start。迁移的主要动机不是单纯性能收益，而是更好的类型体验、TanStack Router / Query / Start 生态整合，以及更统一的 URL 状态和服务端数据状态模型。

性能优化应作为迁移过程中的架构约束一起落地，避免迁移后保留当前的大 bundle、重 hydration 和大 payload 问题。

## 主要优化点

### 资源列表 SSR 缓存

首页、`/resources/1`、常见筛选页、`/subject/:id` 都是高频读请求，适合短时间缓存。

迁移时需要为页面和数据响应明确缓存策略，例如：

```text
Cache-Control: public, max-age=short, stale-while-revalidate=long
```

具体时长后续再根据资源更新频率、后端刷新周期和 CDN 行为确定。

### 拆分首屏大 chunk

当前构建中最大 client JS chunk gzip 后约 `1.15M`，疑似包含完整 `bgmd` subject 数据。迁移时需要避免完整 subject 数据进入首页、Layout、Search 等首屏路径。

可选方向：

- 搜索弹层打开后再加载候选数据。
- subject 数据按需请求或拆成独立资源。
- 只在需要 subject 匹配的页面加载完整数据。
- 避免全局 Layout 静态引入重依赖。

### 优化 `/subject/:id` 数据量

当前 `/subject/:id` 会一次请求 `pageSize: 1000`，并在 Web 层按字幕组或发布者分组。这会增加 SSR CPU、HTML 大小、loader payload、hydration 成本和内存峰值。

迁移时建议改成：

- 首屏只 SSR 关键分组或有限数量资源。
- 其他分组按需展开或分页加载。
- 分组结果可考虑在后端或 server function 中生成，并配合缓存。

### 使用 TanStack Query 统一服务端状态

资源列表、详情页、subject 页、collection 页应统一进入 TanStack Query 模型。

建议边界：

- Router 负责 URL、params、search params 和页面结构。
- Query 负责服务端资源状态、缓存、去重、失效和 hydration。
- Server Functions 负责 Web 内部 same-origin typed RPC。
- Jotai 只负责本地收藏、主题、偏好和纯 UI 状态。

迁移后 route loader 可使用 Query 预取数据，组件使用相同 query key 读取，避免 loader data 和 client query 两套数据源并存。

### 延迟非关键 hydration

Search command palette、Sidebar 收藏、toast、部分 Radix 弹层不是首屏必须交互。

迁移到 TanStack Start 后，可以评估使用 deferred hydration：

- 首屏保留可见 HTML。
- 非关键区域的 JS 加载和 hydration 延后到可见、空闲或交互触发。
- 搜索弹层、收藏侧栏和长列表辅助控件优先纳入评估。

### 独立拆分重依赖页面

`/docs/api` 使用 `swagger-ui-react`，这类重依赖不应影响首页、资源列表和详情页。

迁移时需要确认：

- `/docs/api` 独立 chunk。
- Swagger 相关 CSS 和 JS 不进入主路径。
- 路由级 lazy loading 生效。

### 保留静态资源长缓存

当前静态资源已具备长缓存思路。迁移后要继续确保 hash assets 使用长缓存，例如：

```text
Cache-Control: public, max-age=31536000, immutable
```

需要回归 Start build 输出路径、Hono 或部署层静态资源处理逻辑，以及 Cloudflare / Fly 场景下的资源命中行为。

### 错误响应不可缓存

当前 Remix / Hono 入口对错误页面和代理错误响应会补 `Cache-Control: no-store`。迁移后要保留这个行为。

重点场景：

- SSR 页面状态码 `>= 400`。
- `/api/*` 代理错误。
- `/feed.xml` 和收藏夹 feed 错误。
- sitemap 生成失败。

### 搜索建议按需加载

搜索弹层涉及 subject 数据、SWR、历史状态和 command palette。迁移时建议首屏只渲染搜索入口和基础壳，打开后再加载：

- 搜索候选数据。
- subject 匹配数据。
- command palette 相关交互逻辑。
- 重 UI 依赖。

## 迁移前后观测指标

迁移过程中应固定一组指标，避免只凭主观体感判断：

- 首页 HTML size。
- `/resources/1` HTML size。
- `/subject/:id` HTML size。
- dehydrated Query payload size。
- client JS gzip / brotli size。
- 首页和 `/resources/1` TTFB。
- `/subject/:id` SSR 时间。
- Node / Fly RSS 内存。
- hydration time。
- 主要路由的 chunk 拆分情况。

## 待确认问题

### sync 路径的资源版本时间不一致

`apps/server/src/resources/jobs.ts` 中 `runSyncJob()` 会创建 `fetchedAt = new Date()`，并把该值写入本次 `upsertResources()` 的资源。但同步结束后更新 provider refresh timestamp 时使用的是新的 `new Date()`，而不是前面的 `fetchedAt`。

当前结果是：

```text
resource.fetchedAt ~= provider.refreshedAt
```

二者通常只差一次数据库处理耗时，但并不是同一个版本值。

如果后续把 provider timestamp 作为 Web 端 `anchor` / 数据版本使用，建议把 `runSyncJob()` 改成：

```text
updateRefreshTimestamp(platform, fetchedAt)
```

这样 sync 路径和 fetch 路径一致，资源批次时间、provider refresh timestamp、响应 `timestamp` 的语义更统一。

修复前需要确认是否有逻辑依赖 “sync 完成时间” 而不是 “sync 抓取批次时间”。从当前讨论的缓存 / anchor 语义看，使用同一个 `fetchedAt` 更合理。

## 暂定原则

迁移时优先保证状态边界清晰：

```text
Router = URL 状态和页面结构
Query = 服务端资源状态
Server Functions = Web 内部 typed RPC
Jotai = 本地 UI / 偏好 / 收藏状态
Server Routes 或 Hono = public API / feed / sitemap / health
```

首屏只携带当前页面必须展示和必须立即交互的代码与数据。搜索、收藏、docs、subject 全量数据和长列表都应延后、分块或缓存。
