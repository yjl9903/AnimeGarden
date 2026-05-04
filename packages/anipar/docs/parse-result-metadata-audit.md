# anipar 测试资产元数据解析问题暂存

检查日期：2026-05-04

## 范围

本文档用于承接非标题类问题，避免和 [parse-result-audit.md](/Users/junliang.yan02/GitHub/AnimeGarden/packages/anipar/docs/parse-result-audit.md) 的标题专项混在一起。

这里的候选项包括：

- `season`、`episode`、`episodesRange` 等信息缺失。
- `source`、`platform`、`file`、`subtitle`、`type` 等字段归类不完整。
- 已正确拆出标题，但媒体/字幕/版本/类型信息仍残留在普通字段中。

本文件是元数据问题暂存清单，不是本轮主审查结论。后续如果专门审 metadata，需要按字段语义重新精查样例并确认误报。

## 初步候选统计

| 资产文件 | 唯一候选行数 | 主要候选类型 |
| --- | ---: | --- |
| `ani.csv` | 17 | `season_missing` |
| `lolihouse.csv` | 2 | `type_prefix_in_title` |
| `kirara_fantasia.csv` | 32 | `season_missing`、`type_prefix_in_title` |
| `prejudice_studio.csv` | 2 | `season_missing` |
| `三明治摆烂组.csv` | 1 | `type_prefix_in_title` |
| `喵萌奶茶屋.csv` | 4 | `type_prefix_in_title`、`season_missing` |
| `桜都字幕组.csv` | 40 | 组合媒体、组合字幕、`type_prefix_in_title` |
| `雪飄工作室_flsnow.csv` | 4 | `season_missing`、媒体/字幕残留、`type_prefix_in_title` |

## 待另行精查的方向

1. 季度字段：`第四季`、`Season 2`、`Volume2`、`S2E01` 等是否应统一进入 `season`。
2. 集数与范围：`07+ES07`、`16&17`、`S2E01（总第13集）`、`01-07_完` 等表达如何结构化。
3. 类型字段：`剧场版`、`劇場版`、`Movie` 是否应从标题中剥离并进入 `type`。
4. 媒体字段：`HEVC-10Bit-2160P AAC`、`BDRip HEVC`、`1080p@60FPS` 等组合 tag 如何拆进 `file`。
5. 字幕字段：`外挂GB/BIG5`、`简繁外挂+NCOPED_2`、`繁/體` 等复合字幕 tag 如何拆解。
