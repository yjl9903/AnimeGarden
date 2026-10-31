# 资源与收藏夹分页契约

本文定义资源接口、SDK 和内部 cursor 编码的共同契约。
服务端执行方式见[资源查询与缓存](../server/resources-query.md)，
页面状态管理见[前端资源查询与分页](../web/resources-pagination.md)。

## 请求与响应

资源入口为 `/resources`、`/resources/:provider` 及其尾斜杠形式。
请求使用 `limit` 指定单批数量，使用 `cursor` 指定分页位置：

```ts
type CursorOptions = {
  limit?: number;
  cursor?: string;
};

type CursorPagination = {
  anchor: number;
  limit: number;
  nextCursor: string | null;
  complete: boolean;
};
```

| 字段 | 含义 |
| --- | --- |
| `anchor` | 本次查询使用的数据版本，Unix 毫秒时间戳 |
| `limit` | 本次请求的资源数量上限 |
| `nextCursor` | 下一批游标；结果结束时为 `null` |
| `complete` | 是否已返回全部结果，恒等于 `nextCursor === null` |

`limit` 默认 30。实现接受范围为 **1–1000**；OpenAPI schema、SDK README、Skill 等对外公开文档统一标注 **1–100**。

首批请求省略 cursor；继续查询时保持筛选条件，透传上一批响应的 `nextCursor`。
成功响应始终包含分页信息，空结果也返回实际使用的 anchor。
URL 查询参数中的 cursor、limit 优先于请求正文。

参数解析由 client 的 `parseURLSearch()` 完成：limit 在范围内四舍五入，越界或无效值回退为 30；
未知字段忽略，空 cursor 按首批处理。服务端对解析得到的 cursor 解码，格式错误返回 400。

## 数据版本与排序

资源按 `createdAt DESC, id DESC` 排序，查询范围满足 `indexedAt <= anchor`。
`indexedAt` 是首次入库时间，anchor 固定本次分页可见的入库范围。
删除状态、重复关系和筛选字段使用查询时的数据库值。

时间字段分为：

| 字段 | 语义 |
| --- | --- |
| `pagination.anchor` | 当前资源查询的数据版本 |
| `X-Response-Timestamp` | 当前 provider 数据版本的时间戳 |
| `X-Request-Timestamp` | 请求进入服务端的时间 |
| SDK `timestamp` | 从 `X-Response-Timestamp` 解析的 `Date`；多批查询保留首个成功响应的值 |

资源列表 HTTP 正文由 `resources`、`pagination` 和 `filter` 等业务字段组成；
SDK 的 `timestamp` 来自响应头。固定旧 anchor 查询时，provider 版本可以晚于该 anchor。

## 内部 cursor 编码

Web 和 Server 共用 `packages/shared/src/cursor.ts`：

```ts
interface ResourceCursor {
  anchor: number;
  position?: {
    createdAt: number;
    id: number;
  };
}
```

| 请求形式 | 查询方式 |
| --- | --- |
| 省略 cursor | 服务端选择当前 provider 版本，查询首批 |
| 仅含 anchor | 从指定版本的开头查询 |
| 含 anchor 和 position | 从指定版本的位置之后继续查询 |

`encodeResourcesCursor()` / `decodeResourcesCursor()` 使用无 padding 的 canonical base64url，
载荷为数字 JSON 数组：

```text
[1, anchorMs]
[1, anchorMs, createdAtMs, id]
```

时间值必须是可表示为 Date 的安全整数，id 必须是正安全整数，position 两个字段成对出现。
解码还检查协议版本、载荷长度与编码规范，token 最长 256 字符。
公开 SDK 将 cursor 视为不透明字符串，codec 由内部 shared 包提供。

## SDK 单批与聚合查询

```ts
import { fetchResources } from '@animegarden/client';

const first = await fetchResources({ subject: 1234, limit: 30 });
if (!first.ok) throw first.error;

if (first.pagination.nextCursor) {
  const next = await fetchResources({
    subject: 1234,
    limit: 30,
    cursor: first.pagination.nextCursor
  });
  if (!next.ok) throw next.error;
  console.log(next.resources);
}
```

未指定 `count` 时，SDK 查询一批。指定 `count` 时，SDK 沿 cursor 聚合：

- `count > 0`：累积到指定数量或结果结束；最后一批按剩余数量缩小 limit。
- `count: -1`：持续查询到结果结束。
- `count: 0`：获取分页与筛选元数据，返回空资源数组。
- 聚合查询的默认单批 limit 为 1000；显式 limit 沿用请求值。

结果的 `resources` 是按 href 去重后的累计资源，`pagination` 和 `filter` 来自最后一个成功批次。
达到 count 后，complete 仍由服务端分页结果决定。
SDK 检查批次之间的 anchor 一致性及 cursor 是否重复。

每批完成后，`progress(delta, { anchor, cursor })` 接收新增资源、本批版本和请求所用游标。
count 为 0 时跳过 progress。取消或请求失败返回已获取的部分结果；
应用回调抛出的异常向调用方传播。Result 与错误结构见[错误模型](./error-model.md)。

## 收藏夹

`GET /collection/{hash}` 的 `results[i]` 对应 `filters[i]`，
每项包含 `{ resources, pagination, filter }`，单次读取最多 100 条。
需要继续查询时，将该项的 filter 和 nextCursor 交给资源接口。

`CollectionFilter` 中的 resources、pagination 属于查询结果，不参与保存请求或收藏夹哈希。
保存逻辑也清理旧客户端的 complete 结果字段。

## 接口兼容与发布依赖

- API query/body 中的 `page`、`pageSize` 返回 400。
- API `/resources/:page`、`/resources/:provider/:page` 返回 404。
- Web 旧页码地址的跳转规则见[路由约定](../web/resources-pagination.md#页面与路由)。
- SDK 分页类型为 `CursorPagination`，数量常量为 `DefaultResourcesLimit` 和 `MaxResourcesLimit`。

API、SDK 和 Web 发布时使用一致的 cursor 契约。
数据库需具备 `0008_resources-index-audit.sql` 定义的 indexed_at 字段与回填数据，
迁移约束见[资源索引](../server/resources-indexes.md#迁移与维护)。
