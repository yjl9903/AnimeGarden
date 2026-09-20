# RSS 扩展字段

`/feed.xml` 和 `/collection/:hash/feed.xml` 均输出 RSS 2.0，并在根元素声明
`xmlns:animegarden="https://animes.garden/ns/rss/1.0"`。该命名空间标识固定，不随服务的
`site` 配置变化。

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

此扩展不改变分页或缓存策略：全站 RSS 默认返回 100 条，`pageSize` 最大为 1000，两个接口
的响应缓存时间均为 1 小时。消费者仍需处理轮询期间超出返回窗口的资源，以及后续绑定修正。

## 生成器接口

在 `getRssString()` 的 item 中通过结构化 `extensions` 添加字段，无需拼接 XML：

```ts
extensions: { 'animegarden:subjectId': r.subjectId }
```

字段名使用 `prefix:localName` 格式（名称以 ASCII 字母或下划线开头，后续支持字母、数字、
下划线、点和连字符），并在 feed 的 `xmlns` 中声明对应前缀。值支持字符串、有限数字和布尔值；
`null` / `undefined` 自动省略，`0`、`false` 和空字符串保留。文本由 `XMLBuilder` 转义。
原有 XML 字符串接口 `customData` 仍可使用；同名字段以 `extensions` 中的非空值为准。
