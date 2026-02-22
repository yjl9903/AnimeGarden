# Plans -> Collections 迁移指南

本文档用于规范将旧版 `plans/*.yaml` 迁移到新版 `collections/*.yaml` 的流程。

## 快速执行

1. 执行迁移：

```bash
node apps/animespace/migrate-plans-to-collections.mjs \
  --from example_space/plans \
  --to example_space/collections
```

2. 校验迁移数量：

```bash
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const plansDir = 'example_space/plans';
const colsDir = 'example_space/collections';
for (const file of fs.readdirSync(plansDir).filter(f => f.endsWith('.yaml')).sort()) {
  const a = YAML.parse(fs.readFileSync(path.join(plansDir, file), 'utf8'));
  const b = YAML.parse(fs.readFileSync(path.join(colsDir, file), 'utf8'));
  const planCount = (a.onair || []).length;
  const colCount = (b.subjects || []).length;
  if (planCount !== colCount) {
    console.log('COUNT_MISMATCH', file, planCount, colCount);
  }
}
console.log('done');
NODE
```

## 字段映射规则

| 旧字段（plan） | 新字段（collection） | 规则 |
|---|---|---|
| `title` / `name` | `collection.name` | 优先 `title`，否则 `name` |
| `status` | `collection.enabled` | `onair -> true`，`finish -> false` |
| `date` | `preference.animegarden.after` | 统一转为不带时区的 `YYYY-MM-DD HH:mm:ss` |
| `onair[]` | `subjects[]` | 逐条转换 |
| `title` | `subject.name` | 作为默认名称 |
| `bgm` | `subject.bgm` | 转为 number |
| `directory` | `subject.storage.path` | 保留相对路径 |
| `storage` | `subject.storage.driver` | 非 `anime` 时保留 |
| `fansub` | `subject.source.fansub` | 归一化为字符串数组 |
| `keywords` + `title/alias/translations` | `subject.source.include/exclude` | 继承旧语义，`!` 前缀进入 exclude |
| `preference.keyword.exclude` | `subject.source.exclude` | 合并到 exclude |
| `preference.keyword.order` | `subject.source.order.keywords` | 保留关键词分组顺序 |
| `rewrite.season` | `subject.source.rewrite[].apply.season` | 生成 rewrite 规则 |
| `rewrite.episode.offset` | `subject.source.rewrite[].apply.episode_offset` | 有 fansub 时附加 match |
| `rewrite.episode`（number） | `subject.source.rewrite[].apply.episode` | 直接改写集数 |
| `rewrite.title` | `subject.naming.name` | 迁移为命名名 |
| `season` | `subject.naming.season` | 迁移为命名季 |
| `preference.format.*` | `subject.naming.template` | 同步做 token 转换 |

## 模板 Token 转换

- `{title}` -> `{name}`
- `{ep}` -> `{episode}`
- `{yyyy}` / `{YYYY}` -> `{year}`
- `{MM}` / `{mm}` -> `{month}`
- `{extension}` -> 删除

## 输出格式约定

- 顶层字段之间加一个空行。
- `subjects` 条目之间加一个空行。
- `preference.animegarden.after` 固定为无时区字符串（`YYYY-MM-DD HH:mm:ss`）。

## 冲突与安全规则

- `subject.name` 必须全局唯一。
- 若重名，按以下顺序自动回退：
  - `directory`
  - `title (fileBase)`
  - `title (bgm)`
  - `title #index`
- 同一 storage driver 下禁止路径冲突：
  - 完全相同
  - 前缀冲突
- 每个 `source` 至少保留一个检索字段：
  - `include` 或 `keywords` 或 `search` 或 `subjects`

## 迁移后检查项

迁移完成后至少检查：

1. `collections/*.yaml` 均可正常解析。
2. `subjects` 数量与原 `onair` 数量一致。
3. 无重复 `subject.name`。
4. 同 driver 下无 storage path 冲突。
5. 每个条目都有有效 source 检索字段。

脚本内置了上述检查，若失败会直接报错退出。

## 备注

- 旧配置未写 `fansub` 可以接受；新版可继承 root 级 preference。
- 顶层同时存在 `title` 与 `name` 时，固定使用 `title`。
