# Subject Source（当前实现说明）

本文档描述 `apps/animespace/src/subject/source/*` 与 `apps/animespace/src/subject/animegarden/*` 的当前行为。

## 1. 模块边界

当前 source 模块负责：

1. 解析与校验 `subject.source`
2. 抓取 AnimeGarden 资源
3. 解析标题元数据
4. 应用 rewrite 规则
5. 排序与命名提取

当前不负责：

1. feed / magnet / torrent source 执行
2. 下载任务编排
3. 上传流程

## 2. 输入合法性

代码：`apps/animespace/src/subject/source/schema.ts`

1. `source` 必须是对象且不能是空对象。
2. `source.feed/magnet/torrent` 目前直接报错：`not supported yet`。
3. 支持两种写法：
   - `source.animegarden: {...}`
   - `source: { include/search/... }`（快捷写法）
4. 显式 `source.animegarden` 与快捷字段混用会报错。
5. `source.animegarden` 至少满足一个非空字段：
   - `include`
   - `keywords`
   - `search`
   - `subjects`

## 3. AnimeGarden filter 归一化

代码：`apps/animespace/src/subject/animegarden/schema.ts`

支持并归一化字段：

1. `after`, `before`
2. `search`, `include`, `keywords`, `exclude`
3. `type/types` -> `types`
4. `subject/subjects` -> `subjects`
5. `fansub/fansubs` -> `fansubs`
6. `publisher/publishers` -> `publishers`

归一化规则：

1. 单值/数组统一处理
2. 去重并保序
3. 日期字段解析为 `Date`

## 4. order 与 rewrite

代码：`apps/animespace/src/subject/source/schema.ts`

### 4.1 order

1. `order.fansubs` 支持 string / string[]
2. `order.keywords` 为记录对象，按对象声明顺序转换为数组
3. `order` 不会透传给 AnimeGarden API

### 4.2 rewrite

支持结构：

1. `match.url`, `match.fansub`, `match.season`, `match.episode`
2. `apply.season`, `apply.episode`, `apply.episode_offset`

`episode` 匹配支持：

1. contain
2. range tuple
3. 区间字符串：`>= N`, `> N`, `<= N`, `< N`, `[N, M]`

## 5. 抓取与转换流程

代码：`apps/animespace/src/subject/source/extract.ts`

1. 若有 `source.animegarden`，调用 `system.managers.animegarden.fetchResources(filter)`。
2. 通过 `transformSubjectResource` 转成内部 `SubjectResource`。
3. 使用 `anipar` 解析资源名得到 `parsed` 元数据。
4. 应用 rewrite 规则。
5. 进入提取阶段：分组、排序、命名。

## 6. 提取与排序规则（当前实现）

代码：`apps/animespace/src/subject/source/extract.ts`

1. 仅保留有 `parsed.episode` 的资源。
2. TV 资源按 `SxxExx` 分组，组内选排序第一项。
3. 组间按 `season asc, episode asc`。
4. 排序优先级：
   - `order.fansubs`
   - `order.keywords`
   - `name.localeCompare`

## 7. 当前实现风险提醒

1. 关键词排序里，未命中关键词时 `findIndex` 返回 `-1`，会影响优先级比较结果。
2. fallback 排序当前是 `name.localeCompare`，不是“按创建时间/抓取时间”。
3. `parseResource` 对 `type` 的推断还留有 TODO。

## 8. 对外稳定接口（当前）

1. `Subject.fetchResources(): Promise<ParsedSubjectResource[]>`
2. `Subject.extractResources(resources): Promise<ExtractedSubjectResource[]>`

说明：当前没有独立的 `fetchSourceResources(...)` 导出函数，抓取入口在 `Subject` 实例方法中。
