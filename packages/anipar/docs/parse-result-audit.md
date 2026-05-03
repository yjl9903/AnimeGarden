# anipar 测试资产解析结果复查

检查日期：2026-05-04

## 范围

本次复查既有报告覆盖的 6 个资产文件对应的当前解析结果。本次未修改解析代码、测试代码、测试资产或 snapshot，仅更新本文档。

注意：当前工作区已有新增资产 `喵萌奶茶屋.csv`、`雪飄工作室_flsnow.csv`，本轮按“重新检查这些问题是否还存在”的请求，只复查并清理本文档已有问题；新增资产尚未纳入完整审计。

| 资产文件 | 逻辑用例数 | 当前 snapshot 数 | 当前结论 |
| --- | ---: | ---: | --- |
| `ani.csv` | 1480 | 1480 | 未发现确定性异常 |
| `lolihouse.csv` | 1000 | 1000 | 未发现确定性异常 |
| `kirara_fantasia.csv` | 1808 | 1808 | 剩余 21 行可疑/异常结果 |
| `prejudice_studio.csv` | 391 | 391 | 剩余 84 行可疑/异常结果 |
| `桜都字幕组.csv` | 2600 | 2600 | 剩余 67 行可疑/异常结果 |
| `绿茶字幕组.csv` | 354 | 354 | 未发现确定性异常 |

验证结果：`pnpm -C packages/anipar test:ci` 通过，当前是 `7 passed / 7634 tests passed`。这说明 snapshot 与当前实现一致；下面的问题报告基于语义检查，不是测试失败列表。

## 本轮修复确认

已确认解决并从剩余问题中移除：

- Prejudice-Studio：`标题 - 06 [Bili WEB-DL ...]` 常规后缀集数已可解析；例如第 3、10 行已正确得到 `episode/source/file/subtitle`。
- Prejudice-Studio：`S00E##` 特别篇已可结构化；例如第 19 行已得到 `season.number=0`、`episode.number=7`。
- Prejudice-Studio：`[CHS]`、`[CHS&JP]` 这类字幕语言标签在常规样例中已可解析，不再作为独立剩余问题统计。
- 桜都字幕组：旧式方括号标题已可拆出 `title` 和 `titles`；例如第 1 行已拆为 `戀愛中的小行星`、`戀愛小行星`、`Koisuru Asteroid`。
- 桜都字幕组：单集 `12 END`、`OVA03`、末尾 `v2` 已可结构化。

仍需注意的变化：

- Prejudice-Studio 的 `WEB-DL` 误切从 36 行降到 5 行，但仍存在于部分无空格或复杂标签格式中。
- Prejudice-Studio 的 `[01-12]` 批量集数范围当前大多未进入 `episodeRange`，本轮复查按同类格式重新统计为 42 行。
- 桜都字幕组的标题拆分修复后，原先隐藏在标题里的组合媒体/字幕/集数范围问题更清晰，当前按语义字段完整性重新统计。

## 当前结论

当前剩余待修问题共 172 个唯一可疑行号：

- `kirara_fantasia.csv`：21 行，全部是季度信息未结构化。
- `prejudice_studio.csv`：84 行，主要是英文名内部连字符误拆、批量集数范围未结构化，以及少量媒体标签残留。
- `桜都字幕组.csv`：67 行，主要是组合媒体字段、组合外挂字幕字段、集数范围变体和剧场版类型未完整结构化。

分类计数说明：同一行可能命中多个分类，因此分类数相加不等于唯一行号总数。

## 当前剩余待修问题

### KF-1: 季度信息仍未结构化

影响 21 行：

```text
53, 54, 55, 56, 87, 88, 91, 92, 93, 94, 97, 99, 850, 916, 920, 935, 971, 975, 1740, 1778, 1791
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 53 | `[黒ネズミたち] 歡迎來到實力至上主義的教室 第四季 2年級篇 第一學期 / Youzitsu 4th Season: 2-nensei-hen Gakki - 04 (ABEMA 1920x1080 AVC AAC MP4)` | `episode.number=4`，`platform="ABEMA"`，无 `season`，`title` 仍含 `第四季` | `season.number=4`，标题中季度信息按现有规范移除或进入 `season.title` |
| 850 | `[GJ.Y] 隊長小翼 Season2 青少年篇 / Captain Tsubasa Season 2: Junior Youth-hen - 20 (CR 1920x1080 AVC AAC MKV)` | `episode.number=20`，无 `season`，`title` 仍含 `Season2` | `season.number=2` |

### PS-1: 媒体/集数字段仍残留在标题

影响 15 行，其中 5 行仍有 `WEB-DL` 被切成 `WEB` / `DL`：

```text
80, 89, 144, 163, 255, 272, 274, 279, 283, 287, 293, 303, 316, 319, 321
```

仍存在 `WEB-DL` 误切的行：

```text
89, 163, 255, 272, 303
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 80 | `[Prejudice-Studio] 与游戏中心的少女异文化交流的故事 Game Center Shoujo to Ibunka Kouryuu - 06 [WebRip 1080P AVC 8bit AAC MP4][简英内嵌]` | `titles=["06 [WebRip 1080P AVC 8bit AAC MP4][简英内嵌]"]`，无 `episode/source/file/subtitle` | `episode.number=6`，并解析媒体与字幕字段 |
| 89 | `[Prejudice-Studio] 机动战士高达 跨时之战 Kidou Senshi Gundam GQuuuX Beginning [Bilibili WEB-DL 1080P AVC 8bit AAC MP4][JPN Audio][CHS]` | `title` 含 `[Bilibili WEB`，`titles=["DL 1080P AVC 8bit AAC MP4][JPN Audio]"]` | `WEB-DL` 不应被拆入标题，音轨/字幕也不应残留 |

### PS-2: 英文别名内部连字符仍被误拆

影响 26 行：

```text
2, 6, 11, 17, 26, 38, 47, 58, 219, 233, 247, 252, 269, 277, 285, 286, 291, 302, 307, 309, 313, 317, 326, 359, 367, 387
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 2 | `[Prejudice-Studio] 公主的管弦乐团 Princess-Session Orchestra - 03 [WebRip 1080p AVC 8bit AAC][简繁日内封][V2]` | `title="公主的管弦乐团 Princess"`，`titles=["Session Orchestra"]` | `Princess-Session Orchestra` 应作为完整别名 |
| 26 | `[Prejudice-Studio] 依靠最弱辅助职能【话术士】的我统领世界最强氏族 Saikyou no Shien-shoku Wajutsushi Dearu Ore wa Sekai Saikyou Clan o Shitagaeru [01-12][Bilibili WEB-DL 1080P AVC 8bit AAC MP4][简日内嵌]` | `title` 截到 `Saikyou no Shien`，`titles=["shoku ..."]` | `Shien-shoku` 应保留为同一别名文本 |

### PS-3: 方括号集数范围未结构化

影响 42 行：

```text
26, 31, 41, 119, 124, 129, 140, 143, 151, 159, 170, 182, 184, 185, 191, 193, 195, 208, 210, 215, 224, 230, 234, 235, 238, 239, 240, 246, 259, 262, 264, 267, 268, 275, 281, 288, 298, 306, 318, 332, 337, 370
```

这些行当前大多已经不再污染 `title/titles`，但 `[01-12]`、`[01-03 + #0.8]`、`[13-24]` 等没有进入 `episodeRange`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 124 | `[Prejudice-Studio] 弹速狂飙 BULLET BULLET [01-12][无水印][Bilibili WEB-DL 1080P AVC 8bit AAC MP4][简日内嵌][务必查看bt站简介]` | `title="弹速狂飙 BULLET BULLET"`，无 `episodeRange`，其余媒体/字幕已解析 | `episodeRange={ from: 1, to: 12 }` |
| 239 | `[Prejudice-Studio] 龙与魔女 BURN THE WITCH [01-03 + #0.8][BiliBili WEB-DL 1080P AVC 8bit AAC MP4][简体内嵌]` | 无 `episodeRange` | 需确认 `+ #0.8` 的结构化表达；至少不应丢失范围信息 |

### PS-4: 季度/季范围信息仍未结构化

影响 3 行：

```text
66, 246, 308
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 66 | `[Prejudice-Studio] 我被逐出队伍后过上慢生活 Shin no Nakama S1-S2 [Bilibili WEB-DL 1080P AVC 8bit AAC MP4][简体内嵌&简日内嵌]` | `title="我被逐出队伍后过上慢生活 Shin no Nakama"`，无 `season` | 需要表达 `S1-S2` 季范围或至少保留为结构化 tag |
| 246 | `[Prejudice-Studio] 星球大战：幻境 第二季 Star Wars Visions Volume2 [01-09][Bilibili WEB-DL 1080P AVC 8bit AAC MP4][简体内嵌]` | 无 `season`，无 `episodeRange` | `season.number=2`，`episodeRange={ from: 1, to: 9 }` |

### SK-1: 组合媒体字段未完整结构化

影响 37 行：

```text
17, 20, 26, 29, 30, 34, 37, 46, 47, 52, 67, 68, 73, 74, 81, 84, 86, 93, 110, 117, 120, 137, 153, 167, 174, 187, 190, 193, 202, 216, 232, 243, 286, 292, 311, 320, 354
```

当前 `HEVC-10Bit-2160P AAC` 已不再残留在 `titles`，但仍常被解析为 `file.video.term="HEVC-10Bit-2160P"`，没有拆出 `file.video.resolution="2160P"`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 17 | `[桜都字幕组][魔法纪录 魔法少女小圆外传/Magia Record][01][HEVC-10Bit-2160P AAC][外挂GB/BIG5][WEB-Rip][MKV+ass]` | `file.video.term="HEVC-10Bit-2160P"`，`file.audio.term="AAC"`，无 `file.video.resolution` | `file.video.term="HEVC-10Bit"`，`file.video.resolution="2160P"`，`file.audio.term="AAC"` |
| 202 | `[桜都字幕组][我的青春恋爱物语果然有问题。完/OreGairu.Kan][04][HEVC-10Bit-1440P AAC][外挂GB/BIG5][WEB-Rip][MKV+ass]` | 分辨率同样被并入 `video.term` | 拆出 `1440P` 分辨率 |

### SK-2: 组合外挂字幕字段未完整结构化

影响 40 行：

```text
17, 20, 26, 29, 30, 34, 37, 46, 47, 52, 66, 67, 68, 73, 74, 81, 84, 86, 93, 99, 110, 117, 120, 137, 153, 167, 174, 187, 190, 193, 202, 216, 223, 232, 243, 286, 292, 311, 320, 354
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 17 | `[...][外挂GB/BIG5][WEB-Rip][MKV+ass]` | `subtitle={ format: "ass", encoding: "外挂GB/BIG5" }` | `外挂` 不应混入编码；需结构化外挂形式与 `GB/BIG5` |
| 66 | `[桜都字幕组][猫娘乐园/Nekopara][01][GB/BIG5][1080P][MP4]` | `title="猫娘乐园/Nekopara"`，`titles=["01", "GB/BIG5"]`，无 `subtitle` | 标题仍需拆分，`GB/BIG5` 应进入字幕编码/语言字段 |

### SK-3: 集数范围变体未解析

影响 22 行：

```text
21, 61, 110, 120, 123, 199, 304, 390, 785, 1133, 1306, 1338, 1354, 1421, 1467, 1470, 1599, 1817, 1911, 1914, 1963, 1997
```

主要格式包括：

- `[01~12 END]`
- `[01-11END]`
- `[12.5-23 END]`
- `[01-11][NF 1080p]`

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 21 | `[桜都字幕组][食戟之灵 神之皿/Shokugeki no Soma S4][01~12 END][BIG5][1080P]` | 标题/季度已解析，但无 `episodeRange` | `episodeRange={ from: 1, to: 12, type: "END" }` |
| 304 | `[桜都字幕组][刀剑神域 异界战争終/Sword Art Online - Alicization - War of Underworld][12.5-23 END][GB][1080P]` | 标题已拆分，但无 `episodeRange` | 需确认 `12.5` 是否支持为范围起点；至少不应丢失范围信息 |
| 1421 | `[桜都字幕组] 【我推的孩子】 / Oshi no Ko [01-11][NF 1080p][简繁日内封]` | 标题与媒体/字幕已解析，但无 `episodeRange` | `episodeRange={ from: 1, to: 11 }` |

### SK-4: 剧场版 / Movie 类型未解析

影响 7 行：

```text
601, 658, 886, 1107, 1246, 2117, 2150
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 886 | `[桜都字幕组] 剧场版 少女☆歌剧 Revue Starlight/ Shoujo☆Kageki Revue Starlight Movie[BDRip][1080P][繁体內嵌]` | `source/file/subtitle` 已解析，但无 `type` | `type="剧场版"` 或 `type="Movie"` |
| 1246 | `[桜都字幕组] 摇曳露营△ 剧场版 / Yuru Camp Movie [WEB-Rip][1080P][简繁外挂]` | `source/file/subtitle` 已解析，但无 `type` | `type="剧场版"` 或 `type="Movie"` |

## 建议后续确认

1. Prejudice-Studio 优先处理 `[01-12]` / `[01-03 + #0.8]` 这类批量范围，目前这是该资产最大的剩余类别。
2. Prejudice-Studio 继续收窄 `-` 的切分边界：英文别名内部连字符仍未解决，少量 `WEB-DL` 仍会被拆开。
3. 桜都字幕组优先补齐组合媒体字段拆解，把 `HEVC-10Bit-2160P AAC` 拆成视频编码、分辨率和音频编码。
4. 桜都字幕组继续处理组合外挂字幕字段和集数范围变体；标题拆分本身已大幅改善。
5. Kirara 目前仍只剩季度副标题问题，可单独收尾。
