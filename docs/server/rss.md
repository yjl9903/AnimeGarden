# RSS 扩展字段

`/feed.xml` 和 `/collection/:hash/feed.xml` 均输出 RSS 2.0，并在根元素声明
`xmlns:animegarden="https://animes.garden/ns/rss/1.0"`。该命名空间标识固定，不随服务的
`site` 配置变化。

## 模块职责

`FeedModule` 位于 `src/feed/index.ts`，由 `makeSystem()` 注册为 `system.modules.feed`，
接收已解析的 `filter`、`pagination`、`tracker`，负责资源查询、RSS 内容生成和缓存。
返回 XML、内容摘要、生成时间、最近缓存清空时间及有效性信息，不接收 Request，也不返回 Response。
`src/feed/search.ts` 规范化筛选集合并构造 channel link，`src/feed/cache.ts` 管理内容缓存和
并发生成，容量限制、LRU 淘汰及 TTL 由 `lru-cache` 管理；缓存随 System 实例共享。
标题生成与 XML 序列化分别位于 `feed/meta.ts`、`feed/rss/`。

`server/routes/feed.ts` 负责 URL/body 解析、分页校验、布尔参数转换和 HTTP 响应。
ETag/Last-Modified 格式化、条件请求判断、200/304 状态码与 Cache-Control 均在 controller 层。
收藏夹不存在时，模块返回 undefined，由 controller 转成原有的 HTTP 错误响应。
`server/rss/index.ts` 保留已有公开导出及 `getRssResponse()` HTTP 适配函数，转调模块内的序列化器。

`FeedModule.refresh()` 通过现有模块刷新流程清空 XML 缓存及正在生成的任务登记；System
先刷新 resources，再刷新 feed。生成任务结束时只有仍登记在缓存中的 Promise 才能写回，
避免刷新前启动的旧任务重新填入缓存。QueryManager 不维护 feed 的版本或失效状态。

## Bangumi Subject ID

已绑定 Bangumi 条目的资源在 `<item>` 中包含 `animegarden:subjectId`，值为资源查询返回的
`subjectId`，即 Bangumi 条目 ID。例如：

```xml
<animegarden:subjectId>123456</animegarden:subjectId>
```

未绑定的资源（`subjectId` 为 `null` 或 `undefined`）省略该元素。消费者应将其视为未分类，
不能假定每条资源都具有 Subject ID。该字段复用现有资源查询数据，无需额外调用 Bangumi API。

下游工具可读取命名空间 `https://animes.garden/ns/rss/1.0` 下的 `subjectId` 元素，将一次
RSS 请求中的资源按番剧分类。标准字段 `title`、`link`、`guid`、`pubDate` 和 `enclosure`
保持原有含义。

全站 RSS 默认返回 100 条，`pageSize` 最大为 1000，两个接口的 HTTP 响应缓存时间均为
1 小时。消费者仍需处理轮询期间超出返回窗口的资源，以及后续绑定修正。

## 全站 RSS 缓存与条件请求

`/feed.xml` 在进程内缓存生成好的 XML、摘要和时间信息，最多 128 项、XML 总计
16 MiB，每项有效期 60 秒。相同规范化参数的并发请求共享一次查询和渲染；生成失败不缓存。
缓存命中时先判断条件请求，无需重复查询资源、读取番剧标题、校验 RSS 或渲染 XML。

- `If-None-Match` 支持弱标签、标签列表和 `*`，优先于 `If-Modified-Since`。
- Last-Modified 使用本次表示生成的时间；同一秒内发生刷新时，保守地忽略时间验证器，
  避免秒精度造成错误的 304，仍可使用 ETag 验证。
- 200 和 304 均带 `Cache-Control: public, max-age=3600, s-maxage=3600, stale-while-revalidate=60`。
- 现有资源刷新通知（新增、更新、删除、去重关系、subject 资料/绑定变化）触发 feed 模块清空缓存。
  渲染或等待返回期间被清空操作失效的结果返回 `no-store` 的 200，不保留在 XML 缓存，也不返回 304。
  feed 刷新执行前仍可使用已有缓存，一致性边界沿用现有模块刷新流程。

这层缓存复用现有查询和 Redis 通知机制，没有新增数据库版本、迁移或写入路径。
漏通知时，XML 最迟在自身 60 秒 TTL 到期后重新查询；底层查询仍受其既有缓存与刷新策略约束，
因此该 TTL 不代表数据库修改在 60 秒内一定可见。HTTP 缓存仍可在上述有效期内复用旧响应。
收藏夹 RSS 保持原来的查询和 ETag 流程。

## 全站 RSS 参数规范化

`/feed.xml` 在查询和构造 channel link 前，统一参数名大小写，对集合参数排序、去重，
丢弃未知参数，并省略默认的 `page=1`、`pageSize=100`、`duplicate=true` 和 `tracker=true`。
参数值（如发布者名称和搜索文本）的大小写保持不变，布尔参数另行解析。
例如 `?subject=2&Subject=1&subject=2&page=1&unused=x` 与 `?subject=1&subject=2`
共享同一份进程内 XML 缓存、channel link 和 ETag。该规范化不重定向请求，也不修改 CDN 的 URL 缓存键。

## Tracker 参数

两个 RSS 接口均通过 `tracker` 查询参数控制是否在 enclosure 的磁力链接中追加 tracker，
默认开启。`false`、`off`、`no`、`0` 会关闭，参数名和值均不区分大小写，例如
`/feed.xml?tracker=false`。
全站 RSS 的 `duplicate=false`、`0`、`off`、`no` 不会被当成 true；该参数仍只在指定
provider 时生效，保持现有资源查询语义。

## 生成器接口

在 `getRssString()` 的 item 中通过结构化 `extensions` 添加字段，无需拼接 XML：

```ts
extensions: { 'animegarden:subjectId': r.subjectId }
```

字段名使用 `prefix:localName` 格式（名称以 ASCII 字母或下划线开头，后续支持字母、数字、
下划线、点和连字符），并在 feed 的 `xmlns` 中声明对应前缀。值支持字符串、有限数字和布尔值；
`null` / `undefined` 自动省略，`0`、`false` 和空字符串保留。文本由 `XMLBuilder` 转义。
原有 XML 字符串接口 `customData` 仍可使用；同名字段以 `extensions` 中的非空值为准。
