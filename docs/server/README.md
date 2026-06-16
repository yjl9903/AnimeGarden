# @animegarden/server 文档索引

本目录承载 `apps/server` 相关的关键架构设计、实现记录、运行职责说明和历史决策日志。后续修改后端服务、数据链路、任务调度、缓存、推送或部署职责时，应优先在这里补充对应文档。

## 架构总览

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [architecture-overview.md](./architecture-overview.md) | 后端应用运行形态、启动链路、模块划分、请求/任务路径和代码目录导览 | 新介入后端代码、拆分模块或评估影响范围时先读 |
| [deployment-topology.md](./deployment-topology.md) | 线上域名、Fly app、内网后端与 public API 服务关系 | 排查线上可用性或调整服务部署职责时先读 |

## 服务与数据链路

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [resources-write-flow.md](./resources-write-flow.md) | `server`、`cron`、feed 服务职责，以及 resources 插入、更新、删标、detail 回填链路 | 修改资源写入、同步任务、服务部署职责或 Redis 通知时先读 |
| [telegram-push-flow.md](./telegram-push-flow.md) | Telegram 资源推送状态机、去重键、入队、补偿和测试关注点 | 修改 `apps/server/src/push`、推送触发点或 Telegram 表结构时先读 |

## 查询与索引

| 文档 | 内容 | 适用场景 |
| --- | --- | --- |
| [resources-query-task-review.md](./resources-query-task-review.md) | resources 查询 Task 缓存、预取、fallback 与现状核对 | 修改资源查询、分页筛选、缓存或 fallback 策略时先读 |
| [resources-index-plan.md](./resources-index-plan.md) | resources partial index 与旧索引清理建议 | 新增、删除或评估 resources 表索引时先读 |

## 维护约定

- 涉及线上服务角色时，明确区分部署职责、代码能力和历史实现状态。
- 涉及数据库路径时，说明读写表、触发入口、缓存或通知影响。
- 涉及索引调整时，补充观察指标和回滚/保留建议。
