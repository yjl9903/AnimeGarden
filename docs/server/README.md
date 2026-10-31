# @animegarden/server 文档索引

本目录记录 `apps/server` 的运行职责、数据流程、查询缓存和数据库约束。

## 架构总览

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [architecture-overview.md](./architecture-overview.md) | 后端应用运行形态、启动链路、模块划分、请求/任务路径和代码目录导览 | 新介入后端代码、拆分模块或评估影响范围时先读 |
| [deployment-topology.md](./deployment-topology.md) | 线上域名、Fly app、内网后端与 public API 服务关系 | 排查线上可用性或调整服务部署职责时先读 |

## 资源数据流

按接口、写入、查询和存储顺序阅读：

| 文档 | 内容 |
| --- | --- |
| [分页契约](../client/pagination.md) | API、SDK 与 shared cursor codec |
| [资源写入与版本传播](./resources-write-flow.md) | 抓取批次、upsert、删标、详情回填及通知 |
| [资源查询与缓存](./resources-query.md) | 精确 Task、Redis、keyset SQL 和慢查询隔离 |
| [资源索引](./resources-indexes.md) | 稳定排序、partial index 与迁移约束 |
| [前端分页](../web/resources-pagination.md) | Web 的版本、查询缓存与页面行为 |

## 其他服务与数据链路

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [subject-data-source.md](./subject-data-source.md) | 统一 bgmx 数据源、跨进程刷新、资料持久化与漏推补偿 | 修改番剧资料同步、展示查询或缓存时先读 |
| [rss.md](./rss.md) | RSS 查询范围、缓存、命名空间与扩展字段 | 修改 RSS 输出或接入下游订阅工具时先读 |
| [party-normalization.md](./party-normalization.md) | 用户、字幕组别名归一化、Mikan 联合发布和存量刷数约束 | 修改用户/字幕组写入、别名或存量合并时先读 |
| [telegram-push-flow.md](./telegram-push-flow.md) | Telegram 资源推送状态机、去重键、入队、补偿和测试关注点 | 修改 `apps/server/src/push`、推送触发点或 Telegram 表结构时先读 |

## 维护约定

- 服务角色以部署职责和代码边界为准。
- 涉及数据库路径时，说明读写表、触发入口、缓存或通知影响。
- 索引文档记录查询用途、迁移约束和评估方法。
