# Preference 与 Naming（当前实现说明）

本文档以 `apps/animespace/src` 当前代码为准，描述已实现行为与边界。

## 1. 配置入口

### 1.1 root / collection preference

代码：`apps/animespace/src/subject/preference.ts`

```yaml
preference:
  animegarden:
    after: 2025-01-01
    before: 2025-12-31
    type: 动画
    fansubs: [字幕组A]
    publishers: [发布组A]
  order:
    fansubs: [字幕组A, 字幕组B]
    keywords:
      quality: [1080p, HEVC]
  naming:
    template:
      TV: "{name} S{season}E{episode} {{fansub}}"
      Movie: "{name} {{fansub}}"
```

`animegarden` 当前支持字段：

1. `after`
2. `before`
3. `type/types`
4. `fansub/fansubs`
5. `publisher/publishers`

说明：`type/fansub/publisher` 与 plural 字段会做合并、去重、保序。

### 1.2 subject naming

代码：`apps/animespace/src/subject/schema.ts`

```yaml
naming:
  name: 命名动画
  season: 2
  year: 2025
  month: 10
  template:
    TV: "{name} S{season}E{episode} {{fansub}}"
```

当前还支持字符串简写：

```yaml
naming: 命名动画
```

会被展开成：`{ name: "命名动画" }`。

## 2. 继承与合并

代码：`apps/animespace/src/subject/subject.ts`, `apps/animespace/src/subject/preference.ts`

### 2.1 source.filter 合并

合并优先级：

1. `subject.source.animegarden.filter`
2. `collection.preference.animegarden`
3. `root.preference.animegarden`

规则为字段级覆盖，不做数组拼接。

### 2.2 order 合并

当前逻辑：

1. `fansubs` 先取 `source.order.fansubs`，否则 collection/root。
2. 若 `source.animegarden.filter.fansubs` 存在，会覆盖上一步结果。
3. `keywords` 以组名（`name`）为 key 做覆盖合并。

### 2.3 naming.template 合并

优先级：

1. `subject.naming.template`
2. `collection.preference.naming.template`
3. `root.preference.naming.template`
4. `DefaultNamingTemplate`

## 3. 模板与渲染

代码：`apps/animespace/src/subject/source/naming.ts`

支持 token：

1. `{name}`
2. `{season}`
3. `{episode}`
4. `{fansub}`
5. `{year}`
6. `{month}`

默认模板：

1. TV: `"{name} S{season}E{episode} {{fansub}}"`
2. Movie: `"{name} {{fansub}}"`

渲染规则（当前实现）：

1. 替换上述 token。
2. `season/episode` 小于 10 时补零。
3. 渲染结果仅做 `trim()`。
4. 未实现“连续空白压缩”。
5. 当模板使用 `{{fansub}}` 时，结果会保留外层 `{}`（例如 `{Fansub}`）。

## 4. season/year/month 覆盖行为

代码：`apps/animespace/src/subject/source/extract.ts`

分组提取时的取值顺序：

1. `season = resource.metadata.season ?? subject.naming.season ?? parsed.season ?? 1`
2. `year = resource.metadata.year ?? subject.naming.year ?? parsed.year`
3. `month = resource.metadata.month ?? subject.naming.month ?? parsed.month`

即：只有当 `resource.metadata` 缺失时，才使用 `subject.naming` 覆盖值。

## 5. 与文档设计差异（保留提醒）

以下是当前实现与早期设计文档中常见预期的差异：

1. `naming` 当前可缺省，不是强制必填。
2. 模板默认仍使用 `{{fansub}}` 形式。
3. 渲染阶段未做空白归一化。

这些行为已被现有测试覆盖（`apps/animespace/test/preference.test.ts`）。
