# AnimeGarden 文档索引

本目录记录项目的架构、接口契约、数据流程和维护约束，供开发与运维使用。
各专题描述当前方案，代码行为、配置或职责变化时同步维护对应文档。

## 分类索引

| 分类 | 内容 | 入口 |
| --- | --- | --- |
| anipar | 动画标题解析测试资产、标题和元数据审计 | [anipar/README.md](./anipar/README.md) |
| client | API 分页契约、SDK 返回值和错误模型 | [client/README.md](./client/README.md) |
| integrations | Agent 插件开发、同步、验证与市场分发 | [integrations/README.md](./integrations/README.md) |
| server | 后端服务职责、资源写入、查询优化、Telegram 推送 | [server/README.md](./server/README.md) |
| web | 前端应用行为和埋点说明 | [web/README.md](./web/README.md) |

## 维护约定

- 新增设计和运维说明时，放入对应的 `docs/<module>/` 目录。
- 按职责和数据流组织内容，约束在所属专题定义，其他文档通过链接引用。
- 文档维护当前方案；开发过程、执行结果和提交汇报保留在讨论或变更记录中。
- 文档文件名使用小写短横线，例如 `telegram-push-flow.md`。
- 移动或重命名文档时，同步更新本索引和子目录索引。

## 资源分页阅读顺序

1. [API 与 SDK 分页契约](./client/pagination.md)：字段、cursor 和聚合查询。
2. [资源写入与版本传播](./server/resources-write-flow.md)：入库时间、provider 版本和通知。
3. [服务端查询与缓存](./server/resources-query.md)、[索引](./server/resources-indexes.md)：SQL、Task、Redis 和数据库约束。
4. [前端资源查询与分页](./web/resources-pagination.md)：Query 状态、旁路版本和页面交互。
5. [前端性能与缓存](./web/performance.md)、[事件契约](./web/umami-tracking.md)：缓存边界和埋点。

## 工具链约定

- 本地开发、CI 和 Docker 使用 Node.js 26.12.1；包的最低运行要求仍为 Node.js 24。根目录 `package.json` 的 `packageManager` 字段固定 pnpm 12.15.0，GitHub Actions 和 Docker 构建均读取该字段。
- 类型检查和声明文件构建统一使用 TypeScript 6.0.3；待社区构建工具兼容后再评估升级 TypeScript 7。
- pnpm 的工作区和安装策略配置集中维护在根目录 `pnpm-workspace.yaml`。
- `pnpm-lock.yaml` 同时记录 pnpm 自身的版本与平台包，以及工作区依赖；升级包管理器时一并提交自动生成的锁文件变更。
- 本地使用 `pnpm install` 安装依赖；CI 和 Docker 使用 `pnpm install --frozen-lockfile`，依赖更新工作流使用 `--no-frozen-lockfile` 更新锁文件。
- 本地安装依赖时通过 `prepare` 启用 Husky；涉及 Agent 插件的提交会自动同步、检查并暂存生成文件，详见 [插件维护流程](./integrations/README.md#维护与验证)。
- Docker 安装依赖时使用 `NODE_ENV=development pnpm install --frozen-lockfile`，确保包含构建工具。pnpm 12.3.4 不接受 `--prod=false`；该环境变量覆盖仅作用于安装命令，后续构建和运行仍使用 `NODE_ENV=production`，构建后通过 `pnpm prune --prod --ignore-scripts` 移除开发依赖。裁剪阶段跳过生命周期脚本，避免移除 Husky 后再次执行 `prepare` 导致构建失败；安装阶段仍执行依赖构建脚本。
