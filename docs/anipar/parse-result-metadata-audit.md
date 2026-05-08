# anipar 测试资产元数据解析复查

检查日期：2026-05-04

## 范围

本文档用于承接非标题类问题，避免和 [parse-result-title-audit.md](./parse-result-title-audit.md) 的标题专项混在一起。

本轮复查重点：

- 对比当前 staged snapshot 中标题字段是否有非预期变化。
- 检查元数据归一化后，旧问题是否仍存在。
- 重新统计当前测试资产里的元数据候选问题。

## 标题字段变化

当前 staged snapshot 中仅发现 1 处 `title` / `titles` 相关变化，位于 `雪飄工作室_flsnow.csv:1118`，属于修复项：

- 旧结果：`title="希望之力 大人光之美少女'23/キボウノチカラ～オトナプリキュア'23～/Kibou no Chikara Otona Precure'23"`，`titles=["1080p", "修訂版"]`。
- 当前结果：`title="希望之力 大人光之美少女'23"`，`titles=["キボウノチカラ～オトナプリキュア'23～", "Kibou no Chikara Otona Precure'23"]`，`file.video.resolution="1080p"`，`tags=["修訂版"]`。

未发现新的标题解析回归。标题专项遗留仍按 `parse-result-title-audit.md` 记录，本轮不继续推进。

## 已确认修复

本轮用户修正后，以下旧问题已解决：

- 桜都 `[外挂GB/BIG5]` 已拆为 `subtitle.format="外挂字幕"`、`subtitle.encodings=["GB","BIG5"]`，不再把 `外挂` 混入 encoding。
- 桜都 `HEVC-10Bit-2160P AAC` 仍能正确拆出 `file.video.codec="HEVC"`、`bitDepth="10-bit"`、`resolution="2160p"`、`file.audio.codec="AAC"`。
- Prejudice `S1-S2` 与 `S1-S4` 已进入 `seasonsRange`，不再计为季信息缺失。
- 喵萌 `S1-S2` 已进入 `seasonsRange`，不再计为季信息缺失。
- 雪飘 `1080p` / `修訂版` 进入 `titles` 的问题已修复。
- 当前未再发现明确的媒体信息残留在标题或别名中。

## 当前候选统计

| 资产文件 | 唯一候选行数 | 主要候选类型 |
| --- | ---: | --- |
| `ani.csv` | 17 | `season_missing` |
| `kirara_fantasia.csv` | 37 | `season_missing`、`type_prefix_in_title` |
| `lolihouse.csv` | 2 | `type_prefix_in_title` |
| `prejudice_studio.csv` | 1 | `season_missing` |
| `三明治摆烂组.csv` | 1 | `type_prefix_in_title` |
| `喵萌奶茶屋.csv` | 3 | `type_prefix_in_title` |
| `桜都字幕组.csv` | 4 | `type_prefix_in_title` |
| `雪飄工作室_flsnow.csv` | 4 | `type_prefix_in_title`、`season_missing` |

说明：统计已排除已结构化为 `seasonsRange` 的 `S1-S2` / `S1-S4` 用例。

## 当前主要问题

### M-1: 单季信息仍未结构化

影响集中在 `第二季`、`第四季`、`第五季`、`Season2`、`4th Season` 等单季表达。

代表样例：

| 文件 | 行号 | 当前结果摘要 | 预期方向 |
| --- | ---: | --- | --- |
| `ani.csv` | 416 | `title="MIX 第二季 ~第二個夏天，邁向晴空~"`，无 `season` | 可解析 `season.number=2` |
| `ani.csv` | 1097 | `title="隊長小翼 Season2 青少年篇"`，无 `season` | 可解析 `season.number=2` |
| `kirara_fantasia.csv` | 8 | `title="卡片戰鬥!! 先導者 Divinez 第五季「幻真星戰篇」"`，无 `season` | 可解析 `season.number=5` |
| `kirara_fantasia.csv` | 53 | `title` 含 `第四季`，英文别名含 `4th Season`，无 `season` | 可解析 `season.number=4` |
| `prejudice_studio.csv` | 246 | `volume.number=2`，`title` 仍含 `第二季` | `Volume2 / 第二季` 的语义边界需确认，当前 season 缺失 |
| `雪飄工作室_flsnow.csv` | 1336 | `tags=["第一期完"]`，无 `season` | 可考虑 `season.number=1`，或明确把“第一期完”只作为 tag |

### M-2: 类型前缀已识别但未从标题剥离

当前约 13 行，主要是 `剧场版` / `劇場版` / `特别篇` 前缀仍留在 `title` 中。部分用例已解析出 `type`，但标题仍未清理。

代表样例：

| 文件 | 行号 | 当前结果摘要 | 预期方向 |
| --- | ---: | --- | --- |
| `lolihouse.csv` | 79 | `title="剧场版 吹响吧！上低音号 ~誓言的终曲~"`，无 `type` | 可解析 `type="剧场版"`，标题去掉类型前缀 |
| `喵萌奶茶屋.csv` | 315 | `type="剧场版"`，但 `title="剧场版 白箱"` | 标题中剥离类型前缀 |
| `桜都字幕组.csv` | 1449 | `title="特别篇 吹响！悠风号～合奏比赛～"` | 可解析 `type="特别篇"`，标题去掉类型前缀 |
| `雪飄工作室_flsnow.csv` | 419 | `type="剧场版"`，但 `title` 仍以 `剧场版` 开头 | 标题中剥离类型前缀 |

### M-3: 字幕发布方式与字幕文件格式仍共用一个字段

桜都 `[外挂GB/BIG5]...[MKV+ass]` 的旧问题已经从“外挂混入 encoding”修成了更干净的结果：

```json
{
  "subtitle": {
    "format": "外挂字幕",
    "encodings": ["GB", "BIG5"]
  },
  "file": {
    "extension": "MKV"
  }
}
```

但 `MKV+ass` 中的 `ass` 没有再被表达。当前 `subtitle.format` 既可能表示发布方式（`外挂字幕` / `内嵌字幕` / `内封字幕`），又可能表示字幕文件格式（`ASS字幕`）。如果后续需要同时保留两者，建议拆出新字段，例如字幕发布方式与字幕文件格式分别存储。

## 后续建议

1. 优先确定 `subtitle.format` 的语义边界，避免 `外挂字幕` 与 `ASS字幕` 互相覆盖。
2. 单季识别可独立处理：`第二季`、`第四季`、`第五季`、`Season2`、`4th Season` 是当前主要剩余面。
3. 类型前缀剥离属于低风险清理，但需要先确认“标题字段是否保留类型词”的规范。
