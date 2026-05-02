# anipar 测试资产解析结果复查

检查日期：2026-05-03

## 范围

本次复查 `packages/anipar/test/__assets__` 下 4 个资产文件对应的当前解析结果。未修改解析代码、测试代码、测试资产或 snapshot。

| 资产文件 | 逻辑用例数 | 当前 snapshot 数 | 当前结论 |
| --- | ---: | ---: | --- |
| `ani.csv` | 1480 | 1480 | 未发现确定性异常 |
| `lolihouse.csv` | 1000 | 1000 | 未发现确定性异常 |
| `kirara_fantasia.csv` | 1808 | 1808 | 剩余 21 行可疑/异常结果 |
| `绿茶字幕组.csv` | 354 | 354 | 未发现确定性异常 |

验证结果：`pnpm -C packages/anipar test:ci` 通过，当前是 `5 passed / 4643 tests passed`。这说明 snapshot 与当前实现一致；下面的问题报告基于语义检查，不是测试失败列表。

## 检查方法

按字幕组分批读取资产，使用当前 `parse(title, { fansub })` 生成结果，然后检查以下信号：

- 标题字段中是否残留媒体标签，例如 `[WebRip 1080p ...]`、`(B-Global Donghua 1920x1080 HEVC AAC MKV)`。
- 原标题含明确集数或集数范围时，结果是否缺少 `episode` / `episodeRange`。
- 原标题含明确季度、分部、配音版本时，结果是否仍把这些信息留在 `title` / `titles` 中，且缺少结构化字段。
- 原标题含明确分辨率时，`file.video.resolution` 是否缺失。

## 当前结论

当前剩余待修问题共 21 个唯一可疑行号，全部来自 `kirara_fantasia.csv`，且都属于同一类：季度信息仍未结构化。

## 当前剩余待修问题

### KF-1: 季度信息仍未结构化

影响 21 行：

```text
53, 54, 55, 56, 87, 88, 91, 92, 93, 94, 97, 99, 850, 916, 920, 935, 971, 975, 1740, 1778, 1791
```

主要分两类：

- `歡迎來到實力至上主義的教室 第四季 2年級篇 第一學期 / Youzitsu 4th Season: 2-nensei-hen Gakki`：已正确解析 `episode`、`platform`、`file`，但未解析 `season.number=4`，主标题仍含 `第四季`。
- `隊長小翼 Season2 青少年篇 / Captain Tsubasa Season 2: Junior Youth-hen`：已正确解析 `episode`、`platform`、`file`，但未解析 `season.number=2`，主标题仍含 `Season2`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 53 | `[黒ネズミたち] 歡迎來到實力至上主義的教室 第四季 2年級篇 第一學期 / Youzitsu 4th Season: 2-nensei-hen Gakki - 04 (ABEMA 1920x1080 AVC AAC MP4)` | `episode.number=4`，`platform="ABEMA"`，无 `season`，`title` 仍含 `第四季` | `season.number=4`，标题中季度信息按现有规范移除或进入 `season.title` |
| 850 | `[GJ.Y] 隊長小翼 Season2 青少年篇 / Captain Tsubasa Season 2: Junior Youth-hen - 20 (CR 1920x1080 AVC AAC MKV)` | `episode.number=20`，无 `season`，`title` 仍含 `Season2` | `season.number=2` |

## 建议后续确认

确认“季度词后面还有副标题”的目标结构，例如 `第四季 2年級篇 第一學期`、`Season2 青少年篇` 是否应拆成 `season.number` + `season.title`。若确认要结构化，优先覆盖上述 21 行，当前剩余问题已经集中且可回归验证。
