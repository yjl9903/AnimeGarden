# AnimeSpace Pull / Push / Watch 设计（目标实现）

本文档描述新版 AnimeSpace 中 `pull` / `push` / `watch` 的目标架构与实现规范，作为后续开发与测试对齐基线。

> 说明：本文档是“目标设计”，并非当前实现快照。与当前代码差异请同步参考 `7-design-implementation-gap.md`。

## 1. 目标与边界

1. 明确多层状态模型的职责与同步方向。
2. 给出 `pull`（storage -> sqlite）与 `push`（source -> downloader -> storage -> sqlite）的稳定流程。
3. 给出 `watch` 的调度模型、并发控制与运行时约束。
4. 明确首版默认行为与开关语义，避免实现期再做架构决策。

本文档描述的是“目标设计”，并不代表当前代码已经全部实现。

## 2. 系统分层与真相源

### 2.1 内部真相源：配置文件目录

配置文件（`anime.yaml` + `collections/*.yml`）是系统内部真相源，决定：

1. 要管理哪些 subject（以及启用状态）。
2. subject 的 source / preference / naming / storage 归属。
3. 系统如何驱动 sqlite、qBittorrent、storage。

### 2.2 本地 sqlite（缓存与执行状态层）

sqlite 的职责：

1. 缓存 subject 配置快照，避免每次全量重建上下文。
2. 缓存 AnimeGarden 等外部接口数据，减少重复请求。
3. 缓存与确认 qBittorrent 已同步状态，避免重复任务下发。
4. 缓存 storage 已确认同步状态，避免 push 时重复上传。

sqlite 不是最高真相源，但它是运行期“执行状态权威缓存”。

### 2.3 qBittorrent（半受控）

qBittorrent 使用固定 category：`animespace`。

1. 系统会管理该 category 内种子并同步状态到 sqlite。
2. 用户可在 qBittorrent UI 中查看与手工操作。
3. 因本机同步成本低，启动和周期阶段允许全量拉取该 category 状态并回写 sqlite。

### 2.4 storage（半受控）

1. 在理想受控状态下，storage 内容应由配置 + source + torrent 文件派生得到。
2. push 正向执行时以 sqlite 缓存作为增量依据，不默认全量扫描 storage。
3. 因用户可能手工删除/移动文件，sqlite 与 storage 可能脱节。
4. pull 的职责是把 storage 实际状态反向同步回 sqlite，并输出未匹配文件。

### 2.5 外部真相源：AnimeGarden（单向）

AnimeGarden 是外部数据源：

1. 只允许单向拉取到本地缓存。
2. 本地不会反向写入 AnimeGarden。
3. 后续扩展 RSS 等 provider 时沿用同一模式。

## 3. 目标模块拆分

### 3.1 command

1. `command/refresh.ts`：pull/push 主编排入口。
2. `cli.ts`：命令参数解析与 options 透传（含 watch 间隔与校验开关）。

### 3.2 system

1. `system/system.ts`：流程生命周期、reload 节点、跨模块协同。
2. `system/downloader.ts`（新增）：定义抽象基类 `Downloader`，并由具体 provider（当前 qBittorrent）实现下载任务与状态同步。
3. `system/storage-manager.ts`（新增）：上传/删除任务管理与并发控制。
4. `system/watch.ts`（新增）：watch 内存态数据结构与调度器。

### 3.3 sqlite

1. `subjects`：配置快照。
2. `subject_files`：已确认上传文件与资源绑定关系。
3. `torrents`：下载任务状态与 qBittorrent 状态镜像。
4. `animegarden_*`：外部资源缓存。

### 3.4 subject/source

复用已有能力：

1. `fetchResources()` 拉 source 资源。
2. `extractResources()` 按季/集聚合与命名。
3. 作为 pull/push 的输入层，不承担下载上传执行。

## 4. 关键数据与绑定模型

### 4.1 subject_files

每条记录代表“一个已确认同步到 storage 的文件”，关键字段：

1. `subject_id`
2. `storage` + `path`
3. `checksum`
4. `source`（提取后的资源信息）
5. `animegarden_provider_name` + `animegarden_provider_id`
6. `torrent_info_hash` + `torrent_file_path`

绑定规则：

1. 资源主绑定维度：`animegarden_provider + provider_id`。
2. 文件级绑定维度：`torrent_info_hash + torrent_file_path`。
3. 允许 1 resource -> 多 subject_file（如视频+字幕）。

### 4.2 torrents

用于表达下载侧状态：

1. 基础唯一键：`info_hash`。
2. 同步 qBittorrent category=`animespace` 的运行状态。
3. 用于 push/watch 排程时判断是否已下载完成、缺失或失败。

## 5. 通用流程（pull/push/watch 共享）

1. 加载配置真相源，筛选 enabled subjects。
2. 将本地 subject 配置完整同步到 sqlite（upsert + 清理配置已移除对象）。
3. 拉取 qBittorrent `animespace` category 状态并同步到 sqlite。

上述三步是所有主流程的统一前置阶段。

## 6. Pull 设计（storage -> sqlite）

目标：修正 sqlite 与 storage 的偏差，完成状态回补与历史导入。

### 6.1 主流程

1. 对每个 subject 拉取三份输入：
   1. source 资源列表。
   2. sqlite `subject_files` 列表。
   3. storage 目录文件列表。
2. 扫 sqlite `subject_files`：
   1. 逐条确认 storage 文件存在性。
   2. 可选 `checksum` 强校验。
   3. 已不存在文件从 sqlite 删除。
3. 扫“提取并按季/集分类后的资源列表”，按文件名匹配 storage，回补可确认文件到 sqlite。
4. 扫“source 原始资源列表”，补齐提取阶段未覆盖但可识别的映射。
5. 对 storage 剩余未匹配文件输出报告。

### 6.2 匹配策略与开关

1. 默认仅按文件名匹配，不启用 checksum。
2. 启用 checksum 时：
   1. 对本地存储直接读取计算。
   2. 对远程存储可按需下载后计算。
3. 未匹配文件默认仅报告不改动。

## 7. Push 设计（source -> download -> upload）

目标：根据 source 增量更新 storage，保证 sqlite 可追踪、可恢复。

### 7.1 主流程

1. 复用通用流程与 pull 前置校正步骤。
2. 对每个 subject 构建资源任务：
   1. source 有而 subject_files 无（或部分缺失）：新增任务。
   2. source 无而 subject_files 有：替换删除任务。
   3. source 与 subject_files 均有：校验并可能跳过。
3. 生成完整任务列表后，批量提交待下载 torrent 到 qBittorrent。
4. 每条 torrent 下载完成后，触发关联存储任务执行：
   1. 先执行被替换文件删除（并删除对应 sqlite 记录）。
   2. 再执行文件上传。
   3. 上传成功后写入/更新 sqlite `subject_files`。

### 7.2 删除时机（已定）

替换场景执行策略：

1. 默认自动删除旧文件。
2. 删除动作在“替代资源下载完成后，上传开始前”执行。
3. 删除与新上传属于同一替换任务链，避免无替代时误删。

### 7.3 上传命名规则（已定）

1. 目标文件名：`提取模板名 + 原始扩展名`。
2. 例如模板得到 `作品 S01E01 {字幕组}`，源文件为 `.mkv`，目标为 `作品 S01E01 {字幕组}.mkv`。

### 7.4 push 的 checksum 语义（已定）

1. checksum 在上传阶段用于判定“是否重复上传”。
2. 若 sqlite 中 checksum 缺失，视为变化，执行上传。
3. 若 checksum 可比对且一致，可跳过重复上传。

## 8. Watch 设计（周期执行 push）

watch 是 push 的持续调度器，不是新业务语义。

### 8.1 触发与间隔（已定）

1. 间隔来自 CLI 参数：`--interval <duration>`。
2. 每轮在“任务全部完成”后，进入下一轮触发等待。

### 8.2 配置 reload（已定）

1. 在某一轮所有任务执行完毕后，下一轮开始前 reload space/subjects。
2. 这样可以动态感知配置修改，同时避免执行中途切换上下文。

### 8.3 并发策略（已定）

1. 下载并发：由 `anime.yaml.downloader` 配置指定。
2. 上传并发：
   1. 非本地磁盘存储固定为 `1`。
   2. 本地磁盘存储视为 `Infinity`（不额外限流）。

### 8.4 运行态持久化（已定）

1. watch 状态仅保存在内存。
2. 进程重启后重新计算与调度，不做 sqlite 持久化。

## 9. 配置设计

### 9.1 downloader 配置来源（已定）

qBittorrent 相关配置位于 `anime.yaml.downloader`，敏感值可结合 `!env`。

输入阶段（anime.yaml）采用扁平字段，不要求额外包一层 `qbittorrent`：

1. `provider: qbittorrent`
2. `url`
3. `username`
4. `password`
5. `category`（默认 `animespace`）
6. `concurrency`（下载并发）
7. `savePath`（相对 `animespace root`，默认 `download/`，归一化后 `<animespace_root>/download/`）
8. `pollIntervalMs/requestTimeoutMs` 不开放配置，固定为代码常量

解析归一化后，内部统一为：

1. `downloader.provider`
2. `downloader.qbittorrent.*`（当前实现）
3. 后续可扩展 `downloader.aria2.*` 等 provider 结构

### 9.2 CLI 建议参数

1. `anime watch --interval <duration>`
2. `anime pull --checksum`
3. `anime pull --json`（可选，输出未匹配与变更摘要）

## 10. qBittorrent 状态同步规范

同步范围固定为 category=`animespace`，状态至少覆盖：

1. 不存在
2. 等待下载
3. 下载中
4. 下载暂停
5. 已下载并做种
6. 已完成
7. 已删除
8. 下载后缺失/错误（如 missingFiles）

状态写入 sqlite `torrents`，作为 push/watch 后续调度依据。

## 11. sqlite 迁移与索引建议

建议升级 schema version，并补齐以下能力：

1. `subject_files` 增加查询索引：
   1. `subject_id`
   2. `animegarden_provider_name + animegarden_provider_id`
   3. `torrent_info_hash + torrent_file_path`
2. 保持唯一性约束：
   1. `subject_files(storage, path)`
   2. `torrents(info_hash)`

## 12. 错误处理与可观测性

1. pull：
   1. 匹配失败、checksum 失败、无法访问 storage 均输出分级日志。
   2. 未匹配文件统一汇总。
2. push：
   1. 下载失败与上传失败分开统计。
   2. 单任务失败不阻断同轮其它 subject。
3. watch：
   1. 每轮输出耗时、成功/失败计数。
   2. 下一轮前输出 reload 结果与有效 subject 数量。

## 13. 测试与验收用例

### 13.1 pull

1. sqlite 记录存在但 storage 文件已删除 -> 记录被清理。
2. storage 存在且能匹配提取资源 -> 正确补录 subject_files。
3. 启用 checksum 时，checksum 变更可被识别。
4. 孤儿文件被报告但不改动。

### 13.2 push

1. 新资源可完成下载、上传、落库闭环。
2. 替换场景按既定顺序执行：下载完成 -> 删除旧 -> 上传新 -> 写库。
3. checksum 一致时跳过上传，checksum 缺失时强制上传。
4. 1 resource -> 多文件场景（外挂字幕）绑定正确。

### 13.3 watch

1. `--interval` 生效，轮次触发稳定。
2. 每轮结束后 reload 生效，配置变更可在下一轮观察到。
3. 下载并发与上传并发规则符合预期。

## 14. 首版默认行为清单（落地约束）

1. `watch` 间隔只由 CLI `--interval` 提供。
2. `pull` 默认关闭 checksum 校验。
3. `pull` 对未匹配 storage 文件只报告，不自动删除。
4. `push` 替换场景默认自动删除旧文件，但删除时机必须在替代资源下载完成后。
5. `push` 命名规则为“模板名 + 原扩展名”。
6. `watch` 运行态仅内存，不做持久化。
