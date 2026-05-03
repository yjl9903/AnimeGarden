# anipar 测试资产解析结果复查

检查日期：2026-05-03

## 范围

本次复查 `packages/anipar/test/__assets__` 下 6 个资产文件对应的当前解析结果。未修改解析代码、测试代码、测试资产或 snapshot。

| 资产文件 | 逻辑用例数 | 当前 snapshot 数 | 当前结论 |
| --- | ---: | ---: | --- |
| `ani.csv` | 1480 | 1480 | 未发现确定性异常 |
| `lolihouse.csv` | 1000 | 1000 | 未发现确定性异常 |
| `kirara_fantasia.csv` | 1808 | 1808 | 剩余 21 行可疑/异常结果 |
| `prejudice_studio.csv` | 391 | 391 | 新发现 78 行可疑/异常结果 |
| `桜都字幕组.csv` | 2600 | 2600 | 新发现 317 行可疑/异常结果 |
| `绿茶字幕组.csv` | 354 | 354 | 未发现确定性异常 |

验证结果：`pnpm -C packages/anipar test:ci` 通过，当前是 `7 passed / 7634 tests passed`。这说明 snapshot 与当前实现一致；下面的问题报告基于语义检查，不是测试失败列表。

## 检查方法

按字幕组分批读取资产，使用当前 `parse(title, { fansub })` 生成结果，然后检查以下信号：

- 标题字段中是否残留媒体标签，例如 `[WebRip 1080p ...]`、`[HEVC-10Bit-2160P AAC]`。
- 原标题含明确集数或集数范围时，结果是否缺少 `episode` / `episodeRange`。
- 原标题含明确季度、分部、配音版本、剧场版类型时，结果是否缺少结构化字段。
- 原标题含明确字幕语言/外挂形式、分辨率、音视频编码时，结果是否缺少 `subtitle` / `file` / `source` 字段，或仍残留在 `title` / `titles`。

## 当前结论

当前剩余待修问题共 416 个唯一可疑行号：

- `kirara_fantasia.csv`：21 行，全部是季度信息未结构化。
- `prejudice_studio.csv`：78 行，主要集中在连字符误切，导致 `WEB-DL`、`[01-12]`、`S00E07`、英文名内部连字符等被拆入标题。
- `桜都字幕组.csv`：317 行，主要集中在旧式方括号标题格式未拆分，以及组合媒体/字幕/集数字段未结构化。

分类计数说明：同一行可能命中多个分类，例如 `桜都字幕组.csv:17` 同时命中标题未拆分、组合媒体字段未解析、字幕字段未解析。

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

### PS-1: 连字符误切导致媒体/集数字段残留

影响 50 行，其中 36 行明确命中 `WEB-DL` 被切成 `WEB` / `DL`。

```text
3, 4, 10, 19, 22, 24, 25, 27, 29, 30, 36, 37, 40, 45, 46, 50, 52, 55, 57, 59, 60, 61, 62, 66, 68, 80, 89, 144, 163, 172, 184, 234, 239, 255, 259, 264, 267, 272, 274, 279, 281, 283, 287, 288, 293, 303, 308, 316, 319, 321
```

Prejudice 当前解析路径会调用 `parseMultipleTitles(ctx, false)`，默认分隔符仍包含 `-`。因此在后缀集数/标签未先完整吃掉时，`WEB-DL`、`标题 - 06 [Bili WEB-DL ...]` 会被继续拆成标题别名。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 3 | `[Prejudice-Studio] 直至魔女消逝 - 06 [Bili WEB-DL 1080P AVC 8bit AAC MP4][简日内嵌]` | `title="直至魔女消逝"`，`titles=["06 [Bili WEB", "DL 1080P AVC 8bit AAC MP4]"]`，无 `episode` | `episode.number=6`，`WEB-DL` 只作为 `source`，媒体字段不应残留在 `titles` |
| 10 | `[Prejudice-Studio] 乡下大叔成为剑圣 - 04 [Bili WEB-DL AVC 8bit AAC MP4][CHS&JP]` | `titles=["04 [Bili WEB", "DL AVC 8bit AAC MP4][CHS&JP]"]`，无 `episode` / `file` / `subtitle` | `episode.number=4`，并解析 `source/file/subtitle` |
| 19 | `[Prejudice-Studio] 莉可丽丝：友谊是时间的窃贼 S00E07 [Bili WEB-DL 1080p AVC 8bit AAC MP4][CHS&JP]` | `title` 含 `S00E07 [Bili WEB`，`titles=["DL 1080p AVC 8bit AAC MP4][CHS&JP]"]` | `S00E07` 应结构化，媒体/字幕字段不应留在标题 |

### PS-2: 英文别名内部连字符被误拆

影响 26 行：

```text
2, 6, 11, 17, 26, 38, 47, 58, 219, 233, 247, 252, 269, 277, 285, 286, 291, 302, 307, 309, 313, 317, 326, 359, 367, 387
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 2 | `[Prejudice-Studio] 公主的管弦乐团 Princess-Session Orchestra - 03 [WebRip 1080p AVC 8bit AAC][简繁日内封][V2]` | `title="公主的管弦乐团 Princess"`，`titles=["Session Orchestra"]` | `Princess-Session Orchestra` 应作为完整别名，不能按内部连字符切开 |
| 26 | `[Prejudice-Studio] 依靠最弱辅助职能【话术士】的我统领世界最强氏族 Saikyou no Shien-shoku Wajutsushi Dearu Ore wa Sekai Saikyou Clan o Shitagaeru [01-12][Bilibili WEB-DL 1080P AVC 8bit AAC MP4][简日内嵌]` | `title` 截到 `Saikyou no Shien`，`titles=["shoku ..."]` | `Shien-shoku` 应保留为同一别名文本 |

### PS-3: `S00E##` 特别篇格式未结构化

影响 6 行：

```text
19, 36, 37, 40, 60, 68
```

这些标题都含 `S00E##`，当前结果没有 `episode`，也没有 `season.number=0` 或特别篇类型；同时常伴随 PS-1 的媒体残留。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 19 | `[Prejudice-Studio] 莉可丽丝：友谊是时间的窃贼 S00E07 [Bili WEB-DL 1080p AVC 8bit AAC MP4][CHS&JP]` | `S00E07` 留在 `title`，无 `episode` / `season` | 至少解析 `episode.number=7`；如模型允许，可解析 `season.number=0` 或特别篇类型 |

### PS-4: 方括号集数范围被连字符误拆

影响 9 行：

```text
124, 184, 234, 239, 259, 264, 267, 281, 288
```

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 124 | `[Prejudice-Studio] 弹速狂飙 BULLET BULLET [01-12][无水印][Bilibili WEB-DL 1080P AVC 8bit AAC MP4][简日内嵌][务必查看bt站简介]` | `title="弹速狂飙 BULLET BULLET [01"`，`titles=["12][无水印]"]`，无 `episodeRange` | `episodeRange={ from: 1, to: 12 }`，`无水印` 应作为 tag 或被保留为非标题标签 |
| 184 | `[Prejudice-Studio] 暴食狂战士 Boushoku no Berserk [01-12][BiliBili WEB-DL 1080P AVC 8bit AAC MP4][简体内嵌]` | `title` 含 `[01`，`titles` 含 `12][BiliBili WEB` / `DL ...` | `episodeRange`、`source/file/subtitle` 应分别结构化 |

### PS-5: 字幕/语言变体标签未结构化

影响 17 行：

```text
10, 19, 22, 25, 29, 36, 37, 40, 45, 46, 50, 55, 57, 60, 68, 89, 172
```

主要格式包括 `[CHS]`、`[CHS&JP]`、`[JPN Audio]`、`[English Dub]`、`[CHS&CHT]`。这些标签有时因为前面的 `WEB-DL` 误切而整体留在 `titles`，有时是当前字幕解析规则尚未覆盖。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 10 | `[...][CHS&JP]` | `CHS&JP` 留在 `titles`，无 `subtitle` | 解析为简中/日文字幕或现有模型中最接近的语言结构 |
| 89 | `[Prejudice-Studio] 莉兹与青鸟 Liz to Aoi Tori [WebRip 1080P HEVC 10Bit AAC SRTx2 MKV][JPN Audio][CHS].mkv` | 语言/音轨信息未完整结构化，且有标题残留风险 | `[JPN Audio]` 与 `[CHS]` 应进入音轨/字幕语义字段或明确 tag |

### PS-6: 季度信息未结构化

影响 10 行：

```text
19, 36, 37, 40, 60, 68, 234, 246, 264, 267
```

其中 19、36、37、40、60、68 是 `S00E##` 特别篇；234、264、267 是 `第二季` / `第三季` 与 `S2` / `S3`；246 是 `星球大战：幻境 第二季 Star Wars Visions Volume2`。当前这些季度信息没有进入 `season`，部分还因 PS-4 同时污染了 `title`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 234 | `[Prejudice-Studio] 圣女魔力无所不能 第二季 Seijo no Maryoku wa Bannou desu S2 [01-12][BiliBili WEB-DL 1080P AVC 8bit AAC MP4][简日内嵌]` | `title` 含 `第二季 ... S2 [01`，无 `season` / `episodeRange` | `season.number=2`，`episodeRange={ from: 1, to: 12 }` |
| 264 | `[Prejudice-Studio] 盾之勇者成名錄 第三季（僅限港澳台地區） Tate no Yuusha no Nariagari S3 [01-12][BiliBili WEB-DL 1080P AVC 8bit AAC MKV][简繁内封]` | `title` 含 `第三季 ... S3 [01`，无 `season` / `episodeRange` | `season.number=3`，`episodeRange={ from: 1, to: 12 }` |

### SK-1: 旧式方括号标题未拆分

影响 307 行。

桜都早期标题常见格式是 `[桜都字幕组][中文标题/别名/罗马字][集数][字幕][分辨率]`。当前解析会把整个第二个方括号当成 `title`，没有拆出 `titles`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 1 | `[桜都字幕组][戀愛中的小行星/戀愛小行星/Koisuru Asteroid][11][BIG5][1080P]` | `title="戀愛中的小行星/戀愛小行星/Koisuru Asteroid"`，无 `titles` | `title="戀愛中的小行星"`，`titles=["戀愛小行星", "Koisuru Asteroid"]` |
| 3 | `[桜都字幕组][房間露營△/Heya Camp△][03][BIG5][1080P]` | `title="房間露營△/Heya Camp△"`，无 `titles` | `title="房間露營△"`，`titles=["Heya Camp△"]` |
| 5 | `[桜都字幕组][入間同學入魔了!/Mairimashita! Iruma-kun][01-23 END][BIG5][1080P]` | `episodeRange` 已解析，但 `title` 仍为 `入間同學入魔了!/Mairimashita! Iruma-kun` | 标题与别名应拆分 |

注意：少量作品名自身含 `/`，例如 `Fate/Grand Order`。实现时需要避免简单按所有 `/` 无条件切分导致误伤。

### SK-2: 组合媒体字段未解析

影响 34 行。

格式如 `[HEVC-10Bit-2160P AAC]` 同时包含视频编码、分辨率、音频编码。当前这些字段常残留在 `titles` 中，未拆成 `file.video.term`、`file.video.resolution`、`file.audio.term`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 17 | `[桜都字幕组][魔法纪录 魔法少女小圆外传/Magia Record][01][HEVC-10Bit-2160P AAC][外挂GB/BIG5][WEB-Rip][MKV+ass]` | `titles=["01", "HEVC-10Bit-2160P AAC", "外挂GB/BIG5"]`，仅 `source="WEB-Rip"` | `episode.number=1`，`file.video.term="HEVC-10Bit"`，`file.video.resolution="2160P"`，`file.audio.term="AAC"` |
| 20 | `[桜都字幕组][某科学的超电磁炮T/To Aru Kagaku no Railgun T][07][HEVC-10Bit-2160P AAC][外挂GB/BIG5][WEB-Rip][MKV+ass]` | `HEVC-10Bit-2160P AAC` 残留在 `titles` | 同上 |

### SK-3: 组合字幕字段未解析

影响 42 行。

格式如 `[外挂GB/BIG5]`、`[外挂CHS/CHT]`、`[GB&BIG5]`、`[GB/BIG5]`。当前这些字段常残留在 `titles` 或 `tags` 中，缺少 `subtitle.format`、`subtitle.encoding` / `subtitle.languages`。

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 17 | `[...][外挂GB/BIG5][WEB-Rip][MKV+ass]` | `titles` 中残留 `外挂GB/BIG5` | `subtitle.format="外挂"`，并结构化 `GB/BIG5` |
| 132 | `[桜都字幕组][用我的手指来扰乱吧/Ore no Yubi de Midarero][01-08 END][720P][GB&BIG5]` | `episodeRange` 已解析，但 `GB&BIG5` 进入 `tags` | 应结构化为双字幕编码/语言 |

### SK-4: 集数范围变体未解析

影响 9 行。

主要格式：

- `[01~12 END]`
- `[01-11END]`
- `[12.5-23 END]`
- `[01-11][NF 1080p]`

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 21 | `[桜都字幕组][食戟之灵 神之皿/Shokugeki no Soma S4][01~12 END][BIG5][1080P]` | `titles=["01~12 END"]`，无 `episodeRange` | `episodeRange={ from: 1, to: 12, type: "END" }` |
| 110 | `[桜都字幕组][达尔文游戏/Darwin's Game][01-11END][HEVC-10Bit-2160P AAC][外挂GB/BIG5][WEB-Rip][MKV+ass]` | `titles` 残留 `01-11END`，无 `episodeRange` | `episodeRange={ from: 1, to: 11, type: "END" }` |
| 304 | `[桜都字幕组][刀剑神域 异界战争終/Sword Art Online - Alicization - War of Underworld][12.5-23 END][GB][1080P]` | `titles=["12.5-23 END"]`，无 `episodeRange` | 需确认 `12.5` 是否支持为范围起点；至少不应作为普通标题残留 |
| 1421 | `[桜都字幕组] 【我推的孩子】 / Oshi no Ko [01-11][NF 1080p][简繁日内封]` | `titles=["Oshi no Ko [01-11][NF 1080p]"]`，无 `episodeRange` | `episodeRange={ from: 1, to: 11 }`，`NF 1080p` 不应留在标题 |

### SK-5: 单集 `END` 格式未解析

影响 5 行：`76, 89, 212, 303, 377`

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 76 | `[桜都字幕组][神田川JET GIRLS/Kandagawa Jet Girls(AT-X)][12 END][GB][720P]` | `titles=["12 END"]`，无 `episode`，`tags=["END"]` | `episode.number=12`，`END` 作为 tag 或完结标记 |
| 212 | `[桜都字幕组][公主连结 Re:Dive/Princess Connect! Re:Dive][13 END][BIG5][1080P]` | `titles=["13 END"]`，无 `episode` | `episode.number=13` |

### SK-6: `OVA03` 未解析

影响 1 行：`113`

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 113 | `[桜都字幕组][关于我转生后成为史莱姆的那件事/Tensei Shitara Slime Datta Ken][OVA03][GB][1080P]` | `titles=["OVA03"]`，无 `type` / `episode` | `type="OVA"`，`episode.number=3` |

### SK-7: 末尾 `v2` 未解析为版本

影响 2 行：`207, 277`

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 207 | `[桜都字幕组][隐瞒之事/Kakushigoto][01-12 END][BIG5][1080P]v2` | `tags=["v2"]`，无 `version` | `version=2` |
| 277 | `[桜都字幕组][刀剑神域 异界战争終/Sword Art Online - Alicization - War of Underworld][12.5][HEVC-10Bit][1080P][简繁内封字幕]v2` | `tags=["v2"]`，无 `version` | `version=2` |

### SK-8: 剧场版 / Movie 类型未解析

影响 7 行：`601, 658, 886, 1107, 1246, 2117, 2150`

样例：

| 行号 | 原标题 | 当前结果摘要 | 预期方向 |
| ---: | --- | --- | --- |
| 886 | `[桜都字幕组] 剧场版 少女☆歌剧 Revue Starlight/ Shoujo☆Kageki Revue Starlight Movie[BDRip][1080P][繁体內嵌]` | `source/file/subtitle` 已解析，但无 `type` | `type="剧场版"` 或 `type="Movie"` |
| 1246 | `[桜都字幕组] 摇曳露营△ 剧场版 / Yuru Camp Movie [WEB-Rip][1080P][简繁外挂]` | `source/file/subtitle` 已解析，但无 `type` | `type="剧场版"` 或 `type="Movie"` |

## 建议后续确认

1. 优先确认并实现桜都旧式方括号标题的切分策略；这是最大类问题，但需要避免误切 `Fate/Grand Order` 这类作品名内部斜杠。
2. Prejudice-Studio 建议优先调整 `-` 的切分边界：不要切开 `WEB-DL`、`[01-12]`、英文名内部连字符；也要先解析 `标题 - 03 [媒体][字幕]` 这类后缀，再做多标题拆分。
3. 其次处理桜都组合标签：`HEVC-10Bit-2160P AAC`、`外挂GB/BIG5`、`MKV+ass` 等应统一落到 `file` / `subtitle` / `tags`。
4. 最后补齐集数边缘格式和类型：`01~12 END`、`01-11END`、`12 END`、`OVA03`、`S00E##`、末尾 `v2`、`剧场版/Movie`。
5. Kirara 目前只剩季度副标题问题，可在桜都和 Prejudice 的专项处理后单独收尾。
