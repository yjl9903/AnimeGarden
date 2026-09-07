# 资源与收藏夹分页

HTTP API 和客户端 SDK 将资源查询的分页信息统一放在 `pagination` 中：

```ts
interface PaginationResult {
  page: number;
  pageSize: number;
  complete: boolean;
}
```

`page` 从 `1` 开始，`pageSize` 是请求的每页条数，实际返回的资源可能更少。
`complete: true` 仅表示当前页之后没有更多匹配资源，不保证调用方已经取得之前各页。

## 资源查询

`GET /resources` 返回 `resources`、`pagination` 和 `filter` 等字段，移除了与 `resources`
同级的旧 `complete` 字段。SDK `fetchResources` 成功时同样使用 `result.pagination`：

```ts
import { fetchResources } from '@animegarden/client';

const result = await fetchResources({ subject: 1234, page: 1, pageSize: 100 });

if (result.ok) {
  console.log(result.resources);
  console.log(result.pagination.page, result.pagination.pageSize, result.pagination.complete);
}
```

SDK 使用 `count` 连续请求多页时，`resources` 累积各页资源，`pagination` 描述最后一次成功取得的页。
请求达到指定 `count` 后可能停止，此时 `pagination.complete` 仍可能为 `false`。
失败时的部分结果约定见[错误模型](./error-model.md)。

## 收藏夹查询

`GET /collection/{hash}` 和 SDK `fetchCollection` 的每个 `results[i]` 对应 `filters[i]`，结构为：

```ts
type CollectionResourcePage = {
  resources: Resource[];
  pagination: PaginationResult;
  filter: ResolvedFilterOptions | undefined;
};
```

每个筛选条件默认查询第 `1` 页，每页最多 `1000` 条。收藏夹接口没有新增 `page` 或 `pageSize`
入参，也没有与 `resources` 同级的 `complete` 字段。

需要更多资源时，使用对应 `filters[i]` 的筛选条件调用 `/resources` 或 SDK `fetchResources`，
并传入 `page: results[i].pagination.page + 1` 和相同的 `pageSize`。通过 HTTP 继续查询时，
可复用 `filters[i].searchParams`，再设置 `page` 和 `pageSize`。

客户端 `CollectionFilter` 的查询结果态也使用 `resources` 和 `pagination`。
这两个字段属于查询结果元数据，提交收藏夹以及计算收藏夹哈希时均会排除，不属于保存的筛选条件。

## 破坏性变更迁移

旧字段不再保留兼容别名，需要同步更新调用方、响应样例和测试断言：

| 位置                          | 旧路径                       | 新路径                                  |
| ----------------------------- | ---------------------------- | --------------------------------------- |
| HTTP `/resources` 响应        | `result.complete`            | `result.pagination.complete`            |
| 收藏夹结果项                  | `result.results[i].complete` | `result.results[i].pagination.complete` |
| `CollectionFilter` 查询结果态 | `filter.complete`            | `filter.pagination.complete`            |

SDK `fetchResources` 已有的 `result.pagination.*` 路径保持不变。
若手动构造收藏夹结果项或 `CollectionFilter` 查询结果态，需要提供完整的
`pagination: { page, pageSize, complete }`，不能只移动 `complete` 字段。
