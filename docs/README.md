# AnimeGarden 文档索引

本目录是项目文档的统一入口。修改代码前，先从这里确认相关模块是否已有背景、设计或审计记录；修改后如果行为、配置、命令或服务职责有变化，需要同步补充文档。

## 分类索引

| 分类 | 内容 | 入口 |
| --- | --- | --- |
| anipar | 动画标题解析测试资产、标题和元数据审计 | [anipar/README.md](./anipar/README.md) |
| server | 后端服务职责、资源写入、查询优化、Telegram 推送 | [server/README.md](./server/README.md) |
| web | 前端应用行为和埋点说明 | [web/README.md](./web/README.md) |

## 维护约定

- 新增设计、审计、运维说明时，优先放入对应的 `docs/<module>/` 目录。
- 文档文件名使用小写短横线，例如 `telegram-push-flow.md`。
- 移动或重命名文档时，同步更新本索引和子目录索引。

## 工具链约定

- 本仓库使用 Node.js 24+ 与 pnpm 11。根目录 `package.json` 的 `packageManager` 字段固定 pnpm 版本。
- pnpm 的工作区和安装策略配置集中维护在根目录 `pnpm-workspace.yaml`。
