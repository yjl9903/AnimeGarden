# AnimeGarden 文档索引

本目录是项目文档的统一入口。修改代码前，先从这里确认相关模块是否已有背景、设计或审计记录；修改后如果行为、配置、命令或服务职责有变化，需要同步补充文档。

## 分类索引

| 分类 | 内容 | 入口 |
| --- | --- | --- |
| anipar | 动画标题解析测试资产、标题和元数据审计 | [anipar/README.md](./anipar/README.md) |
| client | API Client 的返回值和错误模型 | [client/README.md](./client/README.md) |
| server | 后端服务职责、资源写入、查询优化、Telegram 推送 | [server/README.md](./server/README.md) |
| web | 前端应用行为和埋点说明 | [web/README.md](./web/README.md) |

## 维护约定

- 新增设计、审计、运维说明时，优先放入对应的 `docs/<module>/` 目录。
- 文档文件名使用小写短横线，例如 `telegram-push-flow.md`。
- 移动或重命名文档时，同步更新本索引和子目录索引。

## 工具链约定

- 本仓库使用 Node.js 24+ 与 pnpm 12。根目录 `package.json` 的 `packageManager` 字段固定 pnpm 版本；GitHub Actions 和 Docker 构建均读取该字段。
- pnpm 的工作区和安装策略配置集中维护在根目录 `pnpm-workspace.yaml`。
- `pnpm-lock.yaml` 同时记录 pnpm 自身的版本与平台包，以及工作区依赖；升级包管理器时一并提交自动生成的锁文件变更。
- 本地使用 `pnpm install` 安装依赖；CI 和 Docker 使用 `pnpm install --frozen-lockfile`，依赖更新工作流使用 `--no-frozen-lockfile` 更新锁文件。
