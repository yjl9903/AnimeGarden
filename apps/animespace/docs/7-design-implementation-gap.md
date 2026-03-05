# AnimeSpace 设计与实现差异清单（2026-03）

本文档用于对齐 `apps/animespace/docs` 与 `apps/animespace/src` 的当前状态，避免把“目标设计”误读为“已实现行为”。

## 1. 本次核对范围

1. 核对文档：`1-data-structure-design.md` ~ `6-downloader-design.md`
2. 核对代码：`apps/animespace/src/{system,subject,download,command,sqlite}/*`
3. 目标：标记“文档与代码冲突项”与“目标设计尚未落地项”

## 2. 已修正文档冲突（当前快照文档）

以下冲突已在文档中修正：

1. SQLite migration 文件路径应为 `apps/animespace/src/sqlite/open.ts`，不是 `connect.ts`。
2. AnimeGarden manager 跳过初始化同步阈值是 5 分钟，不是 2 分钟。
3. `System.close()` 已会级联调用 manager `close()`。
4. `push/pull`、qBittorrent downloader、`subject_files` 写入逻辑已落地，不再属于“未实现”。

## 3. pull/push/watch 目标设计与当前实现差异

### 3.1 CLI 参数与触发模型

1. 目标设计：`watch --interval <duration>`；当前实现：`watch` 无 `--interval`，周期固定为外层 10 分钟 + 内层 5 分钟（`apps/animespace/src/system/system.ts`）。
2. 目标设计：`pull --checksum`；当前实现：CLI 未暴露该参数，且 `pullSubject(...)` 未使用 checksum 分支（`apps/animespace/src/cli.ts`, `apps/animespace/src/command/refresh.ts`）。

### 3.2 通用前置流程

1. 目标设计要求 pull/push/watch 统一前置“同步 qBittorrent 状态到 sqlite”。
2. 当前实现中：
   - `push/watch` 会初始化 downloader（间接同步）。
   - `pull` 不会打开 downloader manager，也不会同步 torrents 状态。

### 3.3 模块落点

1. 目标文档中示例路径包含 `system/downloader.ts`, `system/storage-manager.ts`, `system/watch.ts`。
2. 当前实现实际落点：
   - downloader 抽象与实现在 `apps/animespace/src/download/*`
   - storage 上传管理在 `apps/animespace/src/subject/storage.ts`
   - watch 调度逻辑在 `apps/animespace/src/system/system.ts`

### 3.4 并发语义

1. 目标设计：本地存储上传并发视为 `Infinity`。
2. 当前实现：本地存储队列并发为 `10`，非本地为 `1`（`apps/animespace/src/subject/storage.ts`）。

## 4. downloader 目标设计与当前实现差异

### 4.1 类型与接口签名

1. 设计稿中的 `DownloadTicketStatus` 包含 `resumed`；当前实现是 `existing | created | failed`（`apps/animespace/src/download/torrent.ts`）。
2. 设计稿中的 `runScheduler(hashes): Promise<void>`；当前实现返回 `Promise<string[]>`（返回本轮运行中的 hashes）。
3. 设计稿中的 `getTorrentStatuses(...)`；当前实现命名为 `getTorrentStates(...)`。
4. 设计稿中的 `DownloadEvent` 含 `qbtState`；当前实现事件仅含 `infoHash/status/error`。

### 4.2 状态模型

1. 设计稿建议在 `TorrentStatus` 增加 `deleted`。
2. 当前实现未在 `TorrentStatus` 增加 `deleted`，而是在 `DownloadEventStatus` 中通过 `deleted` 事件表达（`apps/animespace/src/download/torrent.ts`, `apps/animespace/src/download/qbittorrent/index.ts`）。

## 5. 仍建议后续补齐的文档动作

1. 若准备按当前实现对外发布，可补一份“运行手册”文档，明确现有 CLI 可用参数与默认调度周期。
2. 若优先推进目标架构，可在 `5/6` 文档中给每个模块补“状态标签”（`implemented / partial / planned`）。
3. 在实现 `watch --interval` 与 `pull --checksum` 前，建议在 CLI help 文案中明确“当前固定调度周期”与“checksum 未启用”。
