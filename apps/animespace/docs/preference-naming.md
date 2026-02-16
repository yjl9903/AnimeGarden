# AnimeSpace Preference + Naming 设计与实现说明

## 目标

在现有 `source` 解析基础上，补全 `preference` 与 `naming`：

1. 继承链：`subject 对应配置 > collection.preference > root(anime.yaml).preference > 默认值`。
2. `preference.animegarden` 作为 `subject.source.animegarden.filter` 的默认筛选配置。
3. `subject.naming` 支持命名字段覆盖与模板渲染，且对 `season/year/month` 的覆盖仅在 `resource.metadata` 没有对应字段时生效。

## 配置定义

### root / collection preference

```yaml
preference:
  animegarden:
    after: 2025-01-01
    before: 2025-12-31
    types: [动画]
    fansubs: [字幕组A]
    publishers: [发布组A]
  naming:
    template:
      TV: "{name} S{season}E{episode} {fansub}"
      Movie: "{name} {fansub}"
```

说明：

- `animegarden` 仅支持：`after/before/type(s)/fansub(s)/publisher(s)`。
- 解析规则与 `subject.source.animegarden` 相同（单值/数组、singular/plural 合并、去重保序）。
- `naming.template` 为按 `SubjectType` 的模板映射，支持 `TV/Movie`，兼容中文键 `动画/电影` 并归一化。

### subject naming

```yaml
naming:
  name: 动画名
  season: 2
  year: 2025
  month: 10
  template:
    TV: "{name} S{season}E{episode} {fansub}"
    Movie: "{name} {fansub}"
```

说明：

- `name`：命名用显示名称，默认 `subject.name`。
- `season/year/month`：覆盖解析结果时，仅在对应 `resource.metadata` 字段不存在时生效。
- `template`：覆盖上层模板映射。

## 模板规则

仅支持以下 token：

- `{name}`
- `{season}`
- `{episode}`
- `{fansub}`
- `{year}`
- `{month}`

渲染规则：

1. 缺失值替换为空字符串。
2. 渲染后归一化空白（连续空白压缩并 `trim`）。
3. 不支持 `{ep}`、`{{fansub}}` 等旧 token。

默认模板：

- TV: `"{name} S{season}E{episode} {fansub}"`
- Movie: `"{name} {fansub}"`

## 合并策略

### Source filter

按字段覆盖，不做数组拼接：

`subject.source.filter.xxx ?? collection.preference.animegarden.xxx ?? root.preference.animegarden.xxx`

### Naming template

`subject.naming.template > collection.preference.naming.template > root.preference.naming.template > 默认模板`

## 实现落点

1. `src/system/preference.ts`
   - 定义 `Preference`、`PreferenceSchema`、merge helper。
2. `src/subject/schema.ts`
   - `RawCollectionSchema` 增加 `preference`。
   - `RawSubjectSchema.naming` 改为强类型 schema。
3. `src/subject/collection.ts`
   - Collection 持有 preference。
4. `src/subject/subject.ts`
   - 构建阶段完成 source filter 与 naming 继承。
5. `src/subject/source/naming.ts`
   - 模板解析、默认模板、渲染函数。
6. `src/subject/source/extract.ts`
   - 应用 naming 覆盖并填充 `extracted.filename`。

## 验收标准

1. `preference` 在 root 与 collection 均可解析。
2. source filter 按优先级覆盖，且字段行为符合 animegarden 解析。
3. `subject.naming` 为强类型且包含默认模板。
4. `extract` 输出稳定 `filename`。
5. `season/year/month` 覆盖遵守 metadata 守卫规则。
