# AnimeSpace v3 数据结构与流程（当前实现快照）

本文档仅描述 `apps/animespace/src` 的当前实现行为，作为测试与后续实现的对齐基线。

## 1. Space 加载

代码：`apps/animespace/src/system/space.ts`

1. root 优先读取 `ANIMESPACE_ROOT`，否则为 `~/.animespace`。
2. 加载 `<root>/.env`（`override=false`）。
3. 读取 `<root>/anime.yaml`，支持 `!env` 标签（`apps/animespace/src/utils/yaml.ts`）。
4. 解析字段：`storage`、`downloader`、`preference`、`collections`、`sqlite`。
5. 默认值：
   - `downloader`: `{ provider: 'qbittorrent' }`
   - `collections`: `['collections/*.yml', 'collections/*.yaml']`
   - `sqlite.path`: `<root>/animespace.db`
   - `storage.default`: `<root>/anime`

## 2. Collection / Subject 输入与归一化

代码：`apps/animespace/src/subject/schema.ts`, `apps/animespace/src/subject/subject.ts`

### 2.1 RawCollection

1. `name?: string`
2. `enabled?: boolean`
3. `preference?: Preference`
4. `subjects: RawSubject[]`

### 2.2 RawSubject

1. `name: string`
2. `enabled?: boolean`
3. `type`: 支持 `TV/Movie/动画/电影`，默认 `TV`
4. `bgm?: number`
5. `tmdb?: { type: string; id: number }`
6. `storage?: { driver?: string; path?: string }`
7. `naming?: string | object`（可缺省；字符串会展开为 `{ name }`）
8. `source: object`（必填且非空）

### 2.3 Subject 归一化

1. `enabled = rawSubject.enabled ?? rawCollection.enabled ?? true`
2. `storage.driver = rawSubject.storage?.driver ?? 'default'`
3. `storage.path = rawSubject.storage?.path ?? rawSubject.name`
4. `naming.name = rawNaming.name ?? rawSubject.name`
5. `source` 在 schema 阶段解析为强类型结构（`SubjectSource`）

## 3. Preference 合并

代码：`apps/animespace/src/subject/preference.ts`

1. 继承优先级：`subject > collection.preference > root.preference > fallback`
2. `animegarden.filter` 合并为字段级覆盖，不做数组拼接。
3. `order` 合并规则：
   - `fansubs` 优先取 `source.order.fansubs`，否则 collection/root。
   - 若 `source.animegarden.filter.fansubs` 存在，会覆盖前述 `fansubs`。
   - `keywords` 以 `name` 为键做覆盖合并。

## 4. Source 模型与规则

代码：`apps/animespace/src/subject/source/schema.ts`, `apps/animespace/src/subject/animegarden/schema.ts`

1. 当前仅支持 `animegarden`。
2. `source` 空对象非法。
3. `source.feed/magnet/torrent` 当前直接报错（未实现）。
4. 支持显式写法和快捷写法（顶层 filter 字段）。
5. 显式 `source.animegarden` 与快捷字段混用会报错。
6. `source.animegarden` 必须至少包含一个非空检索字段：
   - `include` / `keywords` / `search` / `subjects`

## 5. Rewrite 规则（已实现）

代码：`apps/animespace/src/subject/source/schema.ts`, `apps/animespace/src/subject/source/extract.ts`

1. `rewrite` 是规则数组；每条规则包含 `match` 与 `apply`。
2. 支持匹配字段：`url`, `fansub`, `season`, `episode`。
3. `episode` 支持：
   - contain（单值/数组）
   - range 对象 `[start, end]`
   - 区间字符串：`>= N`, `> N`, `<= N`, `< N`, `[N, M]`
4. `apply` 支持：`season`, `episode`, `episode_offset`。

## 6. 资源抓取与提取

代码：`apps/animespace/src/subject/source/extract.ts`

1. `subject.fetchResources()`：
   - 调用 manager 抓取资源
   - 解析标题（`anipar`）
   - 应用 rewrite
2. `subject.extractResources()`：
   - 按季/集分组，组内排序后选第一个
   - 仅保留能解析出 episode 的资源
   - 最终命名模板渲染生成 `filename`

排序当前实现：

1. 先按 `order.fansubs` 顺序。
2. 再按 `order.keywords` 组顺序。
3. 最后按 `name.localeCompare`。

## 7. Naming 当前实现

代码：`apps/animespace/src/subject/source/naming.ts`

1. 模板键支持 `TV/Movie/动画/电影`。
2. 默认模板：
   - TV: `"{name} S{season}E{episode} {{fansub}}"`
   - Movie: `"{name} {{fansub}}"`
3. token 替换：`{name}`, `{season}`, `{episode}`, `{fansub}`, `{year}`, `{month}`。
4. 渲染后仅 `trim()`，不做“连续空白压缩”。
5. 双花括号写法 `{{fansub}}` 会保留外层大括号（当前行为）。

## 8. SQLite 与迁移

代码：`apps/animespace/src/sqlite/*.ts`

1. `openDatabase` 会执行 `migrateDatabase`。
2. migration 使用运行时 DDL（事务 + schema_version）。
3. 当前版本常量：`CURRENT_SCHEMA_VERSION = 1`。
4. 已知风险：`connect.ts` DDL 与 drizzle table schema 存在不一致（见 review findings）。

## 9. 校验规则

代码：`apps/animespace/src/system/validate.ts`

1. subject name 全局唯一。
2. subject.storage.driver 必须存在于 `space.storage`。
3. 同一 storage driver 下路径禁止前缀冲突。
4. storage path 必须是相对路径，且不能包含 `..`。

## 10. 当前未实现边界

1. `command/refresh.ts` 的 `refreshSubjects` 与 `introspectSubjects` 仍为 TODO。
2. `subject_files` upsert 逻辑仍为 TODO（`Collection.upsertToDatabase`）。
3. 下载管线与 qbittorrent 模块尚未落地。
4. 多个 CLI command action 仍为空实现（bangumi/garden detail/collection 等）。
