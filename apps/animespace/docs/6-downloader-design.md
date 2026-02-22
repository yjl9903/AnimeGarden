# AnimeSpace Downloader 设计（当前 provider: qBittorrent）

本文档细化 `pull/push/watch` 方案中的 downloader 子系统，目标是提供“可直接编码”的接口与行为约束。

## 1. 目标与非目标

### 1.1 目标

1. 管理 qBittorrent `animespace` category 内的下载任务。
2. 将下载状态同步到 sqlite `torrents` 表，作为 push/watch 的执行依据。
3. 提供受控并发下载能力（并发数来自 `anime.yaml.downloader`）。
4. 为 push 提供“可等待的下载完成事件流”，支撑后续删除/上传动作。

### 1.2 非目标（首版）

1. 不支持多下载器 provider 的完整功能落地（当前仅实现 `qbittorrent`），但接口层必须为多 provider 预留统一抽象。
2. 不做复杂调度策略（优先级权重、抢占、时段策略）。
3. 不做下载任务跨进程恢复编排（仅依赖 qbt + sqlite 状态重建）。

## 2. 配置模型（anime.yaml）

downloader 配置位于 `anime.yaml.downloader`。

输入配置采用“扁平模式”，不要求额外套 `qbittorrent: { ... }`：

```yaml
downloader:
  provider: qbittorrent
  url: !env QBT_URL
  username: !env QBT_USERNAME
  password: !env QBT_PASSWORD
  category: animespace
  concurrency: 3
  savePath: download/
```

解析归一化后，内部结构统一为“按 provider key 分桶”：

```yaml
downloader:
  provider: qbittorrent
  qbittorrent:
    url: ...
    username: ...
    password: ...
    category: animespace
    concurrency: 3
    savePath: download/
```

未来扩展示例（归一化后）：

```yaml
downloader:
  provider: aria2
  aria2:
    rpcUrl: ...
    secret: ...
```

字段约束（以 `provider=qbittorrent` 为例）：

1. `provider`: 固定 `qbittorrent`。
2. 输入扁平字段：`url/username/password/category/concurrency/savePath`。
3. 归一化后写入 `downloader.qbittorrent.*` 对应字段。
4. `url`: qbt WebUI API baseURL（建议 `/api/v2` 结尾）。
5. `username/password`: 登录凭据。
6. `category`: 默认 `animespace`。
7. `concurrency`: 下载并发，最小 `1`，默认 `3`。
8. `savePath`: 必须为相对 `animespace root` 的路径。
9. `savePath` 默认 `download/`，归一化后绝对路径为 `<animespace_root>/download/`。
10. `pollIntervalMs` 与 `requestTimeoutMs` 不对外暴露配置，固定为代码常量。

## 3. 数据模型与状态

### 3.1 sqlite `torrents`（首版落库字段）

1. `info_hash`（unique）
2. `downloader`（固定 `qbittorrent`）
3. `status`（AnimeSpace 归一化状态）
4. `files`（torrent 文件列表缓存，可空）
5. `created_at`
6. `updated_at`

### 3.2 AnimeSpace 下载状态枚举

归一化状态（`TorrentStatus`）：

1. `pending`：已入队，未开始或等待槽位。
2. `downloading`：正在下载（含元数据下载）。
3. `completed`：下载完成，可进入上传流程。
4. `failed`：下载失败或文件缺失。
5. `deleted`（建议新增）：在 qbt 中被删除或不可追踪。

### 3.3 qBittorrent -> TorrentStatus 映射

1. `metaDL / forcedMetaDL / queuedDL / pausedDL / stoppedDL / checkingDL / allocating`
   - -> `pending`
2. `downloading / forcedDL / stalledDL`
   - -> `downloading`
3. `uploading / stalledUP / pausedUP / stoppedUP / checkingUP / forcedUP`
   - -> `completed`
4. `error / missingFiles`
   - -> `failed`
5. 不在 `category=animespace` 且本地有追踪记录
   - -> `deleted`

`qbt_state` 原样存库，`status` 用于业务判断。

## 4. 模块接口设计

新增：`apps/animespace/src/download/downloader.ts`

```ts
export type DownloaderProviderType = 'qbittorrent' | 'aria2';

export interface DownloadRequest {
  infoHash: string;
  magnet: string;
  subject: Subject;
  resource: ExtractedSubjectResource;
}

export interface DownloadTicket {
  infoHash: string;
  status: DownloadTicketStatus;
}

export interface DownloadEvent {
  infoHash: string;
  status: DownloadEventStatus;
  qbtState?: string;
  error?: string;
}

export interface DownloaderTransferStats {
  downloadSpeed: number; // bytes/s
  uploadSpeed: number; // bytes/s
  downloaded: number; // bytes
  uploaded: number; // bytes
  connectionStatus?: DownloaderConnectionStatus;
}

export interface TorrentExecutionStatus {
  infoHash: string;
  name: string;
  state: TorrentStatus;
  qbtState: string;
  progress: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peerCount: number;
  seedCount: number;
  leechCount: number;
  size: number;
  eta: number;
  downloaded: number;
  uploaded: number;
}

// Reuse enum from `src/download/torrent.ts`
export const enum TorrentStatus {
  pending = 'pending',
  downloading = 'downloading',
  completed = 'completed',
  failed = 'failed'
}

export const enum DownloadTicketStatus {
  existing = 'existing',
  created = 'created',
  resumed = 'resumed'
}

export const enum DownloadEventStatus {
  completed = 'completed',
  failed = 'failed',
  deleted = 'deleted'
}

export const enum DownloaderConnectionStatus {
  connected = 'connected',
  firewalled = 'firewalled',
  disconnected = 'disconnected'
}

export abstract class Downloader {
  abstract readonly provider: DownloaderProviderType;
  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;
  abstract syncToDatabase(): Promise<void>;
  abstract ensureQueued(requests: DownloadRequest[]): Promise<DownloadTicket[]>;
  abstract runScheduler(hashes: string[]): Promise<void>;
  abstract waitEvents(hashes: string[]): AsyncGenerator<DownloadEvent>;
  abstract getTransferStats(): Promise<DownloaderTransferStats>;
  abstract getTorrentStatuses(hashes?: string[]): Promise<TorrentExecutionStatus[]>;
}
```

接口语义：

1. `Downloader`：
   1. 作为所有 downloader provider 的统一抽象基类。
   2. 新增 provider（如 `aria2`）必须继承并实现同一方法集。
2. `initialize`：
   1. 创建 qbt client 并登录。
   2. 确保 category 存在。
   3. 执行一次全量 category 同步。
3. `syncToDatabase`：
   1. 拉取 category 全量 torrent 列表。
   2. 统一映射并 upsert sqlite `torrents`。
4. `ensureQueued`：
   1. 使用请求中显式提供的 `infoHash/magnet` 作为下载主键。
   2. `subject + resource` 用于上下文关联（日志、回调、后续动作绑定）。
   3. 对每个 `infoHash` 去重。
   4. 不存在时 `addNewMagnet(paused=true)` + 设 category/savePath（savePath 先按 root 归一化为绝对路径）。
   5. 创建成功后，按单个 torrent 调用 `setTorrentShareLimits` 设置默认做种限制。
   6. 已存在时确保 category 正确。
5. `runScheduler`：
   1. 仅管理当前目标 hashes。
   2. 根据 `concurrency` 驱动 start/pause（首版可只 start，不强制 pause）。
6. `waitEvents`：
   1. 轮询并产出 `completed/failed/deleted` 事件。
   2. 同一 hash 同一终态只发一次（内存去重）。
7. `getTransferStats`：
   1. 返回全局下载/上传速度和累计传输量。
   2. 供 CLI/TUI 展示运行态吞吐。
8. `getTorrentStatuses`：
   1. 返回每个 torrent 的执行状态。
   2. 包含必要字段：进度、下载速度、上传速度、peer/seed/leech 数量。

### 4.1 `waitEvents` 设计说明

`waitEvents(hashes)` 保留为异步事件流，原因如下：

1. push 的后续动作是“按 hash 完成即触发”，不是“全量下载结束后统一触发”。
2. 使用异步生成器可直接做流式消费，降低额外轮询编排复杂度。
3. 每个 hash 可在完成时立即进入“删旧 -> 上传新”，减少整体端到端时延。
4. 若后续需要，也可在基类上补充 `waitAll(hashes)` 作为语法糖，但底层仍建议基于事件流。

## 5. 与 push/watch 的协作协议

### 5.1 push 调用序列

1. push 先生成完整执行任务（含需要下载的 torrent 列表）。
2. 调用 downloader `ensureQueued` 批量入队。
3. 调用 `runScheduler(hashes)` 开始执行。
4. 消费 `waitEvents(hashes)`：
   1. 收到 `completed` -> 触发该 hash 的删除/上传任务链。
   2. 收到 `failed/deleted` -> 标记任务失败并记录日志。

### 5.2 watch 调用序列

1. 每轮开始先做 `syncToDatabase`。
2. 执行该轮 push（内部复用同一 downloader 实例）。
3. 全部任务 drain 后，watch reload 并等待下一轮。

## 6. 调度与并发控制

### 6.1 并发规则

1. 并发上限仅受 `downloader.qbittorrent.concurrency` 控制。
2. 调度对象仅限本轮目标 hashes（避免影响用户在同 category 的非托管种子）。

### 6.2 调度算法（首版）

每个轮询周期：

1. 拉取目标 hashes 的远端状态并写库。
2. 统计 `downloading` 数量。
3. 从 `pending` 集合按 `created_at asc` 补充启动到并发上限。
4. 检测终态并发出事件。

说明：

1. 首版不做强制 pause 限速（避免干扰用户手工操作）。
2. 若活跃下载超过并发上限，只记录告警，不主动停种。

## 7. 远端状态同步策略

### 7.1 启动同步

系统启动后先做一次全量 category 同步，建立 sqlite 基线。

### 7.2 周期同步

1. push/watch 执行期按固定轮询间隔（代码常量，首版 `3000ms`）轮询。
2. pull 也复用一次同步步骤，确保 sqlite 里 qbt 状态是最新的。

### 7.3 半受控行为处理

1. 用户手动暂停：
   1. 若该 hash 在当前目标任务中，调度器下一轮可恢复启动。
   2. 若不在目标任务中，保持用户状态不动。
2. 用户手动删除：
   1. 本轮若追踪不到 hash，记为 `deleted` 并发事件。

## 8. 错误与重试策略

1. API 层错误（网络/登录过期/超时）：
   1. 指数退避重试（例如 1s, 2s, 4s，上限 3 次）。
   2. 超过上限则本轮失败返回上层。
2. torrent 层错误（`error/missingFiles`）：
   1. 标记 `failed`。
   2. 发出失败事件供 push 标记失败。
3. 不自动 recheck（首版），由后续命令或 `push --force` 扩展处理。

## 9. qBittorrent API 约束（nqbt）

首版依赖的 API：

1. `login/logout`
2. `getAllCategories/addNewCategory`
3. `getTorrentList`（category 过滤）
4. `addNewMagnet`
5. `setTorrentCategory`
6. `startTorrents`（必要时 `stopTorrents`）
7. `getTorrentContents`（完成后缓存文件列表）
8. `getGlobalTransferInfo`（获取全局下载/上传速度）
9. `setTorrentShareLimits`（按 torrent 设置做种限制）

约束：

1. `addNewMagnet` 一律带 category。
2. 新增种子默认 `paused=true`，由调度器显式启动。
3. `savePath` 一律使用“相对 root -> 绝对路径”的归一化结果透传给 qbt。
4. 新建任务时按 torrent 独立下发默认做种限制（不改全局 qB 设置）。

## 10. 日志与可观测性

每轮输出建议字段：

1. `hash`
2. `status`
3. `qbt_state`
4. `progress`
5. `subject`
6. `retry_count`
7. `elapsed_ms`

关键汇总指标：

1. `queued_count`
2. `downloading_count`
3. `completed_count`
4. `failed_count`
5. `deleted_count`

## 11. 测试与验收

### 11.1 单元测试

1. 状态映射正确性（qbt state -> TorrentStatus）。
2. `ensureQueued` 幂等性（重复请求不重复添加）。
3. 调度器并发控制（不超过配置上限）。
4. 终态事件去重（同 hash 不重复发 completed）。
5. `getTransferStats` 字段映射正确性（qbt -> DownloaderTransferStats）。

### 11.2 集成测试（mock nqbt）

1. 新增 magnet -> pending -> downloading -> completed 全链路。
2. missingFiles -> failed 传播到 push。
3. 用户手动删除后触发 deleted 事件。
4. category 不存在时自动创建成功。

### 11.3 与 push 联调验收

1. push 能按 completed 事件串行触发“删旧 -> 上传新 -> 写库”。
2. 同一 hash 多文件任务可被一次下载事件驱动完成。
3. watch 多轮运行中 downloader 可复用且无内存泄漏。

## 12. 首版默认值（实现落地）

1. `category=animespace`
2. `concurrency=3`
3. `savePath=download/`（归一化后 `<animespace_root>/download/`）
4. 轮询间隔固定 `3000ms`（代码常量）
5. 请求超时固定 `10000ms`（代码常量）
6. 新磁力 `paused=true` 后由调度器启动
7. 不自动强制暂停超额活跃任务
8. 新建 torrent 默认做种限制（代码常量）：
   1. `ratioLimit=1`
   2. `seedingTimeLimit=60`（分钟）
   3. `inactiveSeedingTimeLimit=15`（分钟）
