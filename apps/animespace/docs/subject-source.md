# AnimeSpace v3 Source 实现计划（当前冻结版）

## 1. 文档目标

本文档用于沉淀当前已经达成一致的 `source` 相关设计与实现计划，供后续独立 agent 直接落地实现。

本计划**仅覆盖 source 相关内容**：

1. `subject.source` 的输入约束与归一化。
2. `source.ts` 内查询执行入口（当前仅 AnimeGarden）。
3. 与 `System` / `AnimeGardenSourceManager` 的调用边界。
4. 测试与验收标准。

本计划**不包含候选阶段实现**（分集解析、候选选优、下载/上传任务生成等），后续单独讨论。

---

## 2. 当前状态与问题

当前 `apps/animespace` 中：

1. `Subject.source` 仍为 `unknown`，缺少强约束与标准化结构。
2. `watch` 尚未实现 source 专项执行入口。
3. 已有可复用的 `AnimeGardenSourceManager`：
   - `fetchResources(filter)`
   - `refresh(filter)`
4. 已有 `garden search` 命令可调用 manager，证明查询链路可复用。

目标是先把 source 层实现完整，形成稳定契约，供后续 `watch` 直接消费。

---

## 3. 范围与非范围

### 3.1 In Scope

1. `source` 配置 schema 与语义校验。
2. `source` 归一化规则（快捷写法、字段合并、去重、默认值）。
3. `source.ts` 内直接调用 `AnimeGardenSourceManager` 的查询方法。
4. 对外导出稳定类型与函数接口。

### 3.2 Out of Scope（本阶段明确排除）

1. 候选阶段实现（episode 解析、候选分组、排序选优）。
2. 下载与上传流水线。
3. `feed/magnet/torrent` source 执行器。
4. `watch_jobs` 等任务状态表设计。

---

## 4. 冻结决策（必须按此实现）

1. **不新增 `source-query.ts`**。查询入口统一放在 `source.ts`。
2. 当前仅实现 `AnimeGarden` 查询调用。
3. `source` 与 `source.animegarden` 空对象均非法。
4. 通过“关键检索字段非空”约束防止无意义全量查询：
   - `filter.include`、`filter.keywords`、`filter.search`、`filter.subjects` **均为空时拒绝**。
5. 对 AnimeGarden filter 的单值/数组字段做统一兼容与合并：
   - `fansub` + `fansubs`
   - `type` + `types`
   - `publisher` + `publishers`
   - `subject` + `subjects`
6. 归一化产物中的 `order.fansubs` 为必填字段：
   - 输入有值时使用输入归一化结果。
   - 输入无值时默认 `order.fansubs = filter.fansubs ?? []`。

---

## 5. Source 输入模型与合法性

## 5.1 支持写法

1. 显式写法：

```yaml
source:
  animegarden:
    include: ["示例标题"]
    fansub: "字幕组A"
    order:
      fansubs: ["字幕组A", "字幕组B"]
```

2. 快捷写法（无 `animegarden` 包裹）：

```yaml
source:
  include: ["示例标题"]
  fansubs: ["字幕组A", "字幕组B"]
  order:
    fansubs: ["字幕组B", "字幕组A"]
```

## 5.2 冲突规则

若同时出现：

1. `source.animegarden`（显式）
2. 外层快捷字段（如 `source.include` / `source.fansub` / `source.subjects`）

则直接报错，禁止混用。

## 5.3 非空规则（最终版）

归一化后，当以下四项全部为空或缺失时拒绝：

1. `filter.include`
2. `filter.keywords`
3. `filter.search`
4. `filter.subjects`

即四者至少一个非空。

---

## 6. 归一化设计

## 6.1 目标结构

归一化后的 source 统一为：

```ts
type NormalizedSubjectSource = {
  animegarden: NormalizedAnimeGardenSource;
};

type NormalizedAnimeGardenSource = {
  filter: {
    provider?: string;
    duplicate?: boolean;
    after?: Date;
    before?: Date;
    search?: string[];
    include?: string[];
    keywords?: string[];
    exclude?: string[];
    types?: string[];
    subjects?: number[];
    fansubs?: string[];
    publishers?: string[];
  };
  order: {
    fansubs: string[];
    keywords?: Array<{ name: string; values: string[] }>;
  };
};
```

说明：

1. `order.fansubs` 输出层面必填。
2. 对外查询仅使用 `filter`。
3. `order` 不进入 API 调用。

## 6.2 字段合并规则

### 6.2.1 字幕组

1. 输入支持：
   - `fansub: string | string[]`
   - `fansubs: string | string[]`
2. 归一化：
   - 合并为 `filter.fansubs: string[]`
   - 去重，保留首次出现顺序

### 6.2.2 资源类型

1. 输入支持：
   - `type: string | string[]`
   - `types: string | string[]`
2. 归一化：
   - 合并为 `filter.types: string[]`
   - 去重保序

### 6.2.3 发布者

1. 输入支持：
   - `publisher: string | string[]`
   - `publishers: string | string[]`
2. 归一化：
   - 合并为 `filter.publishers: string[]`
   - 去重保序

### 6.2.4 subject id

1. 输入支持：
   - `subject: number | number[]`
   - `subjects: number | number[]`
2. 归一化：
   - 合并为 `filter.subjects: number[]`
   - 去重保序
   - 非法数字直接报错

## 6.3 `order` 规则

1. `order.fansubs`：
   - 若输入存在，归一化为去重数组。
   - 若输入不存在，默认取 `filter.fansubs ?? []`。
2. `order.keywords`：
   - 仅用于后续排序阶段。
   - 保持 YAML 声明顺序。
   - 每组关键词去重保序。

---

## 7. 查询执行设计（放在 `source.ts`）

## 7.1 关键原则

1. 不新增查询适配文件。
2. `source.ts` 直接负责：
   - 归一化
   - 查询调用
   - 返回原始资源结果

## 7.2 建议导出接口

```ts
export function normalizeSubjectSource(raw: unknown): NormalizedSubjectSource;

export async function fetchSourceResources(
  system: System,
  source: NormalizedSubjectSource,
  options?: { force?: boolean }
): Promise<FetchResourcesResult<FetchResourcesOptions>>;
```

## 7.3 调用策略

1. 当前只有 `animegarden` 分支：
   - `force === true` 调 `system.managers.animegarden.refresh(filter)`
   - 否则调 `system.managers.animegarden.fetchResources(filter)`
2. `filter` 来自归一化产物。
3. `order` 不透传 manager。

## 7.4 错误策略

1. 配置非法（schema/归一化失败）：
   - 直接抛错（属于可修复的本地配置问题）。
2. 远端查询失败（manager 抛错）：
   - 透传错误给上层命令/调度器处理。

---

## 8. 代码改动计划（文件级）

## 8.1 `apps/animespace/src/subject/source.ts`（新增/核心）

实现内容：

1. Raw source 解析与显式/快捷冲突检测。
2. singular/plural 合并归一化。
3. 非空约束校验。
4. `order.fansubs` 默认化与必填输出。
5. `fetchSourceResources`：调用 `AnimeGardenSourceManager`。

## 8.2 `apps/animespace/src/subject/schema.ts`

实现内容：

1. 将 `RawSubjectSchema.source` 从 `NonNullUnknownSchema` 替换为 source 专用 schema。
2. 在 parse 阶段输出归一化后结构。
3. 错误信息聚焦 source 约束，便于用户修配置。

## 8.3 `apps/animespace/src/subject/subject.ts`

实现内容：

1. `source` 字段类型改为 `NormalizedSubjectSource`。
2. `Subject.fromRaw` 中不再保留 unknown source。

## 8.4 `apps/animespace/src/command/refresh.ts`（后续接入点）

实现内容（仅 source 侧）：

1. 在 watch/refesh 链路调用 `fetchSourceResources(system, subject.source, { force })`。
2. 候选逻辑不在本计划内实现。

---

## 9. 测试计划与验收标准

## 9.1 schema/归一化测试

1. `source: {}` 报错。
2. `source.animegarden: {}` 报错。
3. 仅 `include` 合法。
4. 仅 `keywords` 合法。
5. 仅 `search` 合法。
6. 仅 `subjects` 合法。
7. `include/keywords/search/subjects` 全空时报错。
8. 显式 + 快捷混用时报错。

## 9.2 字段合并测试

1. `fansub` + `fansubs` 合并去重保序正确。
2. `type` + `types` 合并去重保序正确。
3. `publisher` + `publishers` 合并去重保序正确。
4. `subject` + `subjects` 合并去重保序正确。

## 9.3 `order` 测试

1. 输入 `order.fansubs` 时按输入归一化结果输出。
2. 未输入 `order.fansubs` 时默认回退到 `filter.fansubs ?? []`。
3. `order.fansubs` 在归一化结果中始终存在。

## 9.4 查询执行测试

1. `force=false` 调用 manager `fetchResources`。
2. `force=true` 调用 manager `refresh`。
3. 查询参数不含 `order`。
4. manager 抛错时上抛。

---

## 10. 模块边界与后续衔接

## 10.1 当前边界

source 模块当前只负责：

1. 输入解析与归一化。
2. 查询参数构建与查询执行。

## 10.2 后续边界（本次不实现）

后续候选模块将消费 source 查询结果，完成：

1. 标题解析与集数识别。
2. 候选分组与选优。
3. 与 `torrents/subject_files` 的状态联动。

---

## 11. 实施顺序建议

1. 先实现 `source.ts` 纯归一化逻辑与单元测试。
2. 再接入 `schema.ts` / `subject.ts` 类型落地。
3. 最后补 `fetchSourceResources` 调用与调用链测试。

---

## 12. 风险与注意事项

1. singular/plural 合并需保证“去重但保序”，避免影响后续优先级语义。
2. `order.keywords` 需要保持 YAML 插入顺序，不可被无序结构打乱。
3. 错误消息应可定位到具体 source 字段，避免调试成本过高。
4. 当前只实现 animegarden，需为未来 `feed/magnet/torrent` 预留扩展位但不提前耦合。

---

## 13. 完成判定（Done）

当以下条件全部满足，即可认为 source 阶段完成：

1. `Subject.source` 不再是 `unknown`。
2. 上述 source 约束全部由代码强校验。
3. 查询调用路径统一通过 `source.ts`，且能触发 `AnimeGardenSourceManager`。
4. 对应测试全部通过（schema + 归一化 + 查询调用）。

