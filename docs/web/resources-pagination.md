# 前端资源查询与分页

前端通过 TanStack Query 管理资源版本、单批查询和无限列表。
API 字段及内部 cursor 编码见[分页契约](../client/pagination.md)，
服务端查询与缓存见[资源查询](../server/resources-query.md)。

## 状态归属

每个 router 实例创建自己的 QueryClient；SSR 按请求隔离。
资源版本保存在该 QueryClient 中，server function 负责返回当前请求结果。

| Query key | 数据 | 用途 |
| --- | --- | --- |
| `['api', 'timestamp']` | `{ ok, timestamp: Date }` | 最新已知版本、状态轮询、页脚展示 |
| `['api', 'resources', 'single', filter]` | 单批资源响应 | 首页、Subject、iframe |
| `['api', 'resources', 'infinite', filter]` | `InfiniteData<ResourceResponse>` | 资源页连续分页 |
| `['api', 'collection', hash]` | 收藏夹及各筛选项首批结果 | 收藏夹页面 |

资源 query key 中的 filter 包括筛选条件与 limit。
列表版本由响应 anchor 表示，续页位置由 `pageParams` 中的 cursor 表示。

## 已知版本的更新

已知版本按最大值更新，来源为：

- 成功状态响应的 provider timestamp；
- 成功资源响应的 pagination.anchor；
- 收藏夹各项成功结果的 pagination.anchor。

资源响应推进版本时保留 timestamp Query 的 dataUpdatedAt；
首次从资源响应获知版本时将其设为 0。这样资源加载与状态轮询各自保持新鲜度规则。
timestamp 缓存的 gcTime 为 Infinity，保留到 QueryClient 生命周期结束。

版本比较同时覆盖响应处理和缓存写入阶段，保证已知版本单调递增。
状态刷新失败时保留已知版本；尚无版本时，首次失败结果供页面展示错误。

## 旁路状态刷新

根布局挂载非 Suspense 的 timestamp Query：

- 前台每 60 秒刷新；
- 回到前台和网络恢复时按 stale 状态刷新；
- 页面处于后台时暂停定时刷新；
- iframe 页面停用该轮询。

成功状态响应会刷新前台处于 idle 且 stale 或 invalidated 的活跃资源查询。
正在执行的资源请求继续完成。
轮询与资源请求可并行发起，状态请求遵循自身 HTTP 缓存。

## 首批查询

发起资源请求时同步读取当前已知版本：

| 状态 | 首批请求 |
| --- | --- |
| 已知版本 | `encodeResourcesCursor({ anchor: timestamp })` |
| 未知版本 | 省略 cursor，由服务端选择版本 |

每次首批加载使用一次资源请求。筛选链接仅携带条件，版本在查询开始时确定。
查询期间全局版本推进时，新列表仍可展示已发出的有效响应；
同一列表已经展示的版本则保持单调递增。

导航通过 `loadResourceList()` 使用原生 `queryClient.infiniteQuery()`。
缓存 fresh 时复用，已知版本高于缓存列表 anchor 时以 `staleTime: 0` 重查首批。
导航刷新失败时，若同一查询已有成功缓存，loader 使用缓存完成导航，
页面继续订阅并展示刷新错误；Query 的错误状态和新鲜度时间保持不变。
没有成功缓存时异常继续传播，首次错误响应仍按页面错误展示处理。

## 无限查询

资源页使用 `useSuspenseInfiniteQuery(resourcesListQueryOptions(filter))`：

```ts
type ResourcePages = InfiniteData<ResourceResponse>;
```

共享 options 的关键配置：

| 配置 | 规则 |
| --- | --- |
| `initialPageParam` | undefined，按首批规则读取当前版本 |
| `getNextPageParam` | 返回上一批 nextCursor，null 转为 undefined |
| `pages` | 1，普通 refetch 读取一个首批 |
| `staleTime` | 1 分钟 |
| `retry` | false |

`pages: 1` 同时保留在 loader 与 observer options 中。
当前 TanStack Query 5.104.5 将它用于普通 refetch 的批次数；
滚动追加仍可保留多批数据。挂载、焦点恢复、网络恢复、失效和旁路刷新均使用这一配置。

刷新期间继续展示旧批次，成功后用新首批替换，失败时保留旧批次。
首次请求失败也保持查询订阅，后续刷新成功即可恢复页面。
相同 anchor 的刷新同样替换列表，以反映删除和筛选字段变化。

续页调用 `fetchNextPage({ cancelRefetch: false })`：

1. 使用当前列表的 nextCursor。
2. 使用首批响应中已解析的 filter 与 limit。
3. 检查响应 anchor 一致、nextCursor 前进。
4. 由原生 Infinite Query 追加 pages、维护加载和错误状态。

重复触发复用进行中的请求。普通 refetch 可取消旧续页，
迟到的旧响应由 Query 的取消机制隔离。

## 滚动交互

`InfiniteScrollSentinel` 在列表底部注册 IntersectionObserver，rootMargin 为 `300px 0px`。
尾部接近视口时自动加载下一批，加载结束后重新观察尾部位置。

自动请求间隔至少 1 秒：首次立即执行，后续将请求耗时计入间隔，仅等待剩余时间。
尾部离开观察范围、筛选变化、加载状态变化、完成或卸载时清理等待任务。
续页失败暂停自动加载，点击重试可立即重新请求。

状态样式：

- 加载或等待：居中的蓝色旋转图标，保留“加载中”的无障碍名称。
- 失败：居中的紧凑单行错误图标、“资源加载失败”和“重试”。
- 完成：移除观察点。

## 页面与路由

| 页面 | 资源读取与展示 |
| --- | --- |
| `/resources` | 每批 30 条，连续滚动分页 |
| 首页 | 单批预览；有更多结果时显示右对齐的“→ 全部资源” |
| `/subject/:subject` | 一次最多 1000 条，按字幕组或发布者分组；分组标题链接进入资源页 |
| `/collection/:hash` | 每个筛选项最多 100 条；有更多结果时显示“→ 全部资源” |
| `/iframe` | loader 按 URL limit 读取一批，静态展示；limit 变化时重新加载 |

Subject 概览刷新时替换整批。收藏夹以无外框分组展示，
表格沿用 Layout 内容宽度，标题使用响应式左缩进，分组间距为 gap-12。

站内资源跳转使用 `Link` 与 `getResourcesRouteLink()`。
canonical 与资源导航仅保留筛选条件，cursor 和 limit 属于查询状态。

| 旧地址 | 行为 |
| --- | --- |
| Web `/resources/:page` | HTML 与 Markdown 均 308 到 `/resources`，保留规范化筛选 |
| Web `/subject/:subject/:page` | 数据加载前 308 到 `/subject/:subject`，保留查询参数 |

iframe 保留 className、style 和筛选参数，使用 loader 数据静态渲染。
其数量默认值和实现上限沿用 API。

## 实现入口

| 职责 | 位置 |
| --- | --- |
| 版本、单批、无限查询 | `apps/web/src/query/animegarden.ts` |
| API server functions | `apps/web/src/query/proxy.ts` |
| QueryClient 生命周期 | `apps/web/src/router.tsx` |
| 状态轮询 | `apps/web/src/routes/__root.tsx` |
| 资源页 loader 与订阅 | `apps/web/src/routes/resources/index.tsx` |
| 滚动触发与预览链接 | `apps/web/src/components/Resources/load-more.tsx` |
| HTTP 缓存 | [前端性能与缓存](./performance.md) |
| 交互事件 | [Umami 埋点](./umami-tracking.md) |
