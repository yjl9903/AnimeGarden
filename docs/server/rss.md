# RSS 输出契约

`/feed.xml` 和 `/collection/:hash/feed.xml` 均输出 RSS 2.0，并在根元素声明
`xmlns:animegarden="https://animes.garden/ns/rss/1.0"`。该命名空间标识固定，不随服务的
`site` 配置变化。

## 查询范围与缓存

`/feed.xml` 与资源接口共用筛选和 cursor 解析，使用 limit 指定单批数量，默认 30，
实现接受 1–1000。对外公开数量范围沿用[分页契约](../client/pagination.md)的 1–100 约定。
`/collection/:hash/feed.xml` 汇总收藏夹各筛选项的首批结果，每项最多 100 条。

两个接口成功响应的缓存均为 `public, max-age=3600`。
RSS 返回当前窗口内的条目；订阅方按 guid 或资源链接去重，并处理后续字段修正。

## Bangumi Subject ID

已绑定 Bangumi 条目的资源在 `<item>` 中包含 `animegarden:subjectId`，值为资源查询返回的
`subjectId`，即 Bangumi 条目 ID。例如：

```xml
<animegarden:subjectId>123456</animegarden:subjectId>
```

未绑定的资源（`subjectId` 为 `null` 或 `undefined`）省略该元素，订阅方按未分类处理。
字段值直接来自资源查询结果。

下游工具可读取命名空间 `https://animes.garden/ns/rss/1.0` 下的 `subjectId` 元素，将一次
RSS 请求中的资源按番剧分类。标准字段 `title`、`link`、`guid`、`pubDate` 和 `enclosure`
保持原有含义。

## Tracker 参数

两个 RSS 接口均通过 `tracker` 查询参数控制是否在 enclosure 的磁力链接中追加 tracker，
默认开启。仅小写 `false`、`off`、`no` 会关闭，例如 `/feed.xml?tracker=false`。

## 生成器接口

在 `getRssString()` 的 item 中通过结构化 `extensions` 添加字段，无需拼接 XML：

```ts
extensions: { 'animegarden:subjectId': r.subjectId }
```

字段名使用 `prefix:localName` 格式（名称以 ASCII 字母或下划线开头，后续支持字母、数字、
下划线、点和连字符），并在 feed 的 `xmlns` 中声明对应前缀。值支持字符串、有限数字和布尔值；
`null` / `undefined` 自动省略，`0`、`false` 和空字符串保留。文本由 `XMLBuilder` 转义。
原有 XML 字符串接口 `customData` 仍可使用；同名字段以 `extensions` 中的非空值为准。
